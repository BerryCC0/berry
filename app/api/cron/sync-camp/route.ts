/**
 * Cron Job: Sync Camp Data
 * Syncs voters (delegates), proposals, and candidates from Goldsky to Neon DB
 * Also resolves ENS names for voters to enable partial text search
 * 
 * Vercel Cron: configured in vercel.json (every 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

const GOLDSKY_ENDPOINT = 'https://api.goldsky.com/api/public/project_cldf2o9pqagp43svvbk5u3kmo/subgraphs/nouns/prod/gn';

// ============================================================================
// GraphQL Queries
// ============================================================================

const DELEGATES_QUERY = `
  query Delegates($first: Int!, $skip: Int!) {
    delegates(
      first: $first
      skip: $skip
      orderBy: delegatedVotesRaw
      orderDirection: desc
      where: { delegatedVotesRaw_gt: "0" }
    ) {
      id
      delegatedVotes
      tokenHoldersRepresentedAmount
      nounsRepresented {
        id
      }
      votes(first: 1, orderBy: blockTimestamp, orderDirection: desc) {
        blockTimestamp
      }
    }
  }
`;

// Also fetch accounts (Noun holders) who may have delegated their votes
const ACCOUNTS_QUERY = `
  query Accounts($first: Int!, $skip: Int!) {
    accounts(
      first: $first
      skip: $skip
      where: { tokenBalance_gt: "0" }
    ) {
      id
      tokenBalance
      nouns {
        id
      }
    }
  }
`;

const PROPOSALS_QUERY = `
  query Proposals($first: Int!, $skip: Int!) {
    proposals(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      title
      description
      status
      proposer {
        id
      }
      forVotes
      againstVotes
      abstainVotes
      quorumVotes
      startBlock
      endBlock
      createdTimestamp
      executionETA
    }
  }
`;

const PROPOSAL_VERSIONS_QUERY = `
  query ProposalVersions($first: Int!, $skip: Int!) {
    proposalVersions(
      first: $first
      skip: $skip
      orderBy: createdAt
      orderDirection: desc
    ) {
      id
      proposal {
        id
      }
      title
      description
      updateMessage
      createdAt
    }
  }
`;

const CANDIDATES_QUERY = `
  query Candidates($first: Int!, $skip: Int!) {
    proposalCandidates(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      slug
      proposer
      canceled
      createdTimestamp
      lastUpdatedTimestamp
      latestVersion {
        content {
          title
          description
          contentSignatures {
            id
          }
        }
      }
    }
  }
`;

const CANDIDATE_VERSIONS_QUERY = `
  query CandidateVersions($first: Int!, $skip: Int!) {
    proposalCandidateVersions(
      first: $first
      skip: $skip
      orderBy: createdTimestamp
      orderDirection: desc
    ) {
      id
      proposal {
        id
      }
      createdTimestamp
      updateMessage
      content {
        title
        description
      }
    }
  }
`;

// ============================================================================
// Types
// ============================================================================

interface DelegateData {
  id: string;
  delegatedVotes: string;
  tokenHoldersRepresentedAmount: number;
  nounsRepresented: { id: string }[];
  votes: { blockTimestamp: string }[];
}

interface AccountData {
  id: string;
  tokenBalance: string;
  nouns: { id: string }[];
}

interface ProposalData {
  id: string;
  title: string;
  description: string;
  status: string;
  proposer: { id: string };
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  quorumVotes: string;
  startBlock: string;
  endBlock: string;
  createdTimestamp: string;
  executionETA: string | null;
}

interface ProposalVersionData {
  id: string;
  proposal: { id: string };
  title: string;
  description: string;
  updateMessage: string;
  createdAt: string;
}

interface CandidateData {
  id: string;
  slug: string;
  proposer: string;
  canceled: boolean;
  createdTimestamp: string;
  lastUpdatedTimestamp: string;
  latestVersion: {
    content: {
      title: string;
      description: string;
      contentSignatures: { id: string }[];
    };
  } | null;
}

interface CandidateVersionData {
  id: string;
  proposal: { id: string };
  createdTimestamp: string;
  updateMessage: string;
  content: {
    title: string;
    description: string;
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

async function queryGoldsky<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(GOLDSKY_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await response.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

async function fetchAllPaginated<T>(
  query: string,
  key: string,
  maxItems: number = 2000
): Promise<T[]> {
  const allItems: T[] = [];
  let skip = 0;
  const first = 1000;
  
  while (allItems.length < maxItems) {
    const data = await queryGoldsky<Record<string, T[]>>(query, { first, skip });
    const items = data[key];
    
    if (!items || items.length === 0) break;
    
    allItems.push(...items);
    
    if (items.length < first) break;
    skip += first;
  }
  
  return allItems;
}

async function resolveENS(address: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.ensideas.com/ens/resolve/${encodeURIComponent(address)}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.name || null;
  } catch {
    return null;
  }
}

async function batchResolveENS(
  addresses: string[],
  existingENS: Map<string, string | null>
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const toResolve = addresses.filter(addr => !existingENS.has(addr.toLowerCase()));
  
  // Copy existing ENS names
  for (const [addr, name] of existingENS) {
    results.set(addr, name);
  }
  
  // Resolve new addresses in batches (limit to 50 per cron run to stay within timeout)
  const batchSize = 10;
  const maxToResolve = Math.min(toResolve.length, 50);
  
  for (let i = 0; i < maxToResolve; i += batchSize) {
    const batch = toResolve.slice(i, i + batchSize);
    await Promise.all(batch.map(async (address) => {
      const ensName = await resolveENS(address);
      results.set(address.toLowerCase(), ensName);
    }));
    // Rate limit
    if (i + batchSize < maxToResolve) {
      await new Promise(r => setTimeout(r, 100));
    }
  }
  
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// Sync Functions
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlFunction = any;

async function syncVoters(sql: SqlFunction): Promise<{ inserted: number; updated: number }> {
  const results = { inserted: 0, updated: 0 };
  
  // Fetch all delegates from Goldsky
  const delegates = await fetchAllPaginated<DelegateData>(DELEGATES_QUERY, 'delegates', 1000);
  
  if (delegates.length === 0) return results;
  
  // Get existing ENS names from database
  const existingVoters = await sql`SELECT address, ens_name FROM legacy_voters` as { address: string; ens_name: string | null }[];
  const existingENS = new Map<string, string | null>();
  for (const v of existingVoters) {
    existingENS.set(v.address.toLowerCase(), v.ens_name);
  }
  
  // Resolve ENS for new addresses
  const addresses = delegates.map(d => d.id);
  const ensMap = await batchResolveENS(addresses, existingENS);
  
  // Upsert voters
  for (const delegate of delegates) {
    const address = delegate.id.toLowerCase();
    const ensName = ensMap.get(address) || null;
    const delegatedVotes = parseInt(delegate.delegatedVotes) || 0;
    const nounsRepresented = delegate.nounsRepresented.map(n => parseInt(n.id));
    const totalVotes = delegate.votes?.length || 0;
    const lastVoteAt = delegate.votes?.[0]?.blockTimestamp 
      ? new Date(parseInt(delegate.votes[0].blockTimestamp) * 1000).toISOString()
      : null;
    
    try {
      const existing = await sql`SELECT address FROM legacy_voters WHERE address = ${address}` as { address: string }[];
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO legacy_voters (address, ens_name, delegated_votes, nouns_represented, total_votes, last_vote_at)
          VALUES (${address}, ${ensName}, ${delegatedVotes}, ${nounsRepresented}, ${totalVotes}, ${lastVoteAt})
        `;
        results.inserted++;
      } else {
        await sql`
          UPDATE legacy_voters 
          SET ens_name = COALESCE(${ensName}, ens_name),
              delegated_votes = ${delegatedVotes},
              nouns_represented = ${nounsRepresented},
              total_votes = ${totalVotes},
              last_vote_at = COALESCE(${lastVoteAt}, last_vote_at),
              updated_at = NOW()
          WHERE address = ${address}
        `;
        results.updated++;
      }
    } catch (error) {
      console.error(`Error syncing voter ${address}:`, error);
    }
  }
  
  return results;
}

async function syncAccounts(sql: SqlFunction): Promise<{ inserted: number; updated: number }> {
  const results = { inserted: 0, updated: 0 };
  
  // Fetch all accounts (Noun holders) from Goldsky
  const accounts = await fetchAllPaginated<AccountData>(ACCOUNTS_QUERY, 'accounts', 1000);
  
  if (accounts.length === 0) return results;
  
  // Get existing voters
  const existingVoters = await sql`SELECT address FROM legacy_voters` as { address: string }[];
  const existingSet = new Set(existingVoters.map(v => v.address.toLowerCase()));
  
  // Filter to accounts not already in voters table
  const newAccounts = accounts.filter(a => !existingSet.has(a.id.toLowerCase()));
  
  // Insert new accounts with ENS resolution (limit to 50 per run)
  const toProcess = newAccounts.slice(0, 50);
  
  for (const account of toProcess) {
    const address = account.id.toLowerCase();
    const nounsRepresented = account.nouns.map(n => parseInt(n.id));
    
    // Try to resolve ENS
    let ensName: string | null = null;
    try {
      const ensRes = await fetch(`https://api.ensideas.com/ens/resolve/${address}`);
      if (ensRes.ok) {
        const ensData = await ensRes.json();
        ensName = ensData.name || null;
      }
    } catch {
      // Skip ENS errors
    }
    
    try {
      await sql`
        INSERT INTO legacy_voters (address, ens_name, delegated_votes, nouns_represented)
        VALUES (${address}, ${ensName}, 0, ${nounsRepresented})
        ON CONFLICT (address) DO UPDATE SET
          ens_name = COALESCE(EXCLUDED.ens_name, legacy_voters.ens_name),
          nouns_represented = EXCLUDED.nouns_represented,
          updated_at = NOW()
      `;
      results.inserted++;
    } catch (error) {
      console.error(`Error syncing account ${address}:`, error);
    }
    
    // Rate limit ENS resolution
    await new Promise(r => setTimeout(r, 50));
  }
  
  return results;
}

async function syncProposals(sql: SqlFunction): Promise<{ inserted: number; updated: number }> {
  const results = { inserted: 0, updated: 0 };
  
  // Fetch all proposals from Goldsky
  const proposals = await fetchAllPaginated<ProposalData>(PROPOSALS_QUERY, 'proposals', 1000);
  
  for (const proposal of proposals) {
    const id = parseInt(proposal.id);
    const proposer = proposal.proposer.id.toLowerCase();
    
    try {
      const existing = await sql`SELECT id FROM legacy_proposals WHERE id = ${id}` as { id: number }[];
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO legacy_proposals (
            id, title, description, status, proposer,
            for_votes, against_votes, abstain_votes, quorum_votes,
            start_block, end_block, created_timestamp, execution_eta
          ) VALUES (
            ${id}, ${proposal.title}, ${proposal.description}, ${proposal.status || 'PENDING'}, ${proposer},
            ${parseInt(proposal.forVotes) || 0}, ${parseInt(proposal.againstVotes) || 0},
            ${parseInt(proposal.abstainVotes) || 0}, ${parseInt(proposal.quorumVotes) || 0},
            ${proposal.startBlock ? BigInt(proposal.startBlock) : null},
            ${proposal.endBlock ? BigInt(proposal.endBlock) : null},
            ${proposal.createdTimestamp ? BigInt(proposal.createdTimestamp) : null},
            ${proposal.executionETA ? BigInt(proposal.executionETA) : null}
          )
        `;
        results.inserted++;
      } else {
        await sql`
          UPDATE legacy_proposals SET
            title = ${proposal.title},
            description = ${proposal.description},
            status = ${proposal.status || 'PENDING'},
            for_votes = ${parseInt(proposal.forVotes) || 0},
            against_votes = ${parseInt(proposal.againstVotes) || 0},
            abstain_votes = ${parseInt(proposal.abstainVotes) || 0},
            quorum_votes = ${parseInt(proposal.quorumVotes) || 0},
            execution_eta = ${proposal.executionETA ? BigInt(proposal.executionETA) : null},
            updated_at = NOW()
          WHERE id = ${id}
        `;
        results.updated++;
      }
    } catch (error) {
      console.error(`Error syncing proposal ${id}:`, error);
    }
  }
  
  return results;
}

async function syncProposalVersions(sql: SqlFunction): Promise<{ inserted: number }> {
  const results = { inserted: 0 };
  
  // Fetch all proposal versions from Goldsky
  const versions = await fetchAllPaginated<ProposalVersionData>(PROPOSAL_VERSIONS_QUERY, 'proposalVersions', 2000);
  
  // Group by proposal to calculate version numbers
  const versionsByProposal = new Map<string, ProposalVersionData[]>();
  for (const version of versions) {
    const proposalId = version.proposal.id;
    if (!versionsByProposal.has(proposalId)) {
      versionsByProposal.set(proposalId, []);
    }
    versionsByProposal.get(proposalId)!.push(version);
  }
  
  // Sort each proposal's versions by createdAt and assign version numbers
  for (const [proposalId, propVersions] of versionsByProposal) {
    propVersions.sort((a, b) => parseInt(a.createdAt) - parseInt(b.createdAt));
    
    for (let i = 0; i < propVersions.length; i++) {
      const version = propVersions[i];
      const versionNumber = i + 1;
      
      try {
        // Check if proposal exists first
        const proposalExists = await sql`SELECT id FROM legacy_proposals WHERE id = ${parseInt(proposalId)}` as { id: number }[];
        if (proposalExists.length === 0) continue;
        
        const existing = await sql`SELECT id FROM legacy_proposal_versions WHERE id = ${version.id}` as { id: string }[];
        
        if (existing.length === 0) {
          await sql`
            INSERT INTO legacy_proposal_versions (
              id, proposal_id, version_number, title, description, update_message, created_at
            ) VALUES (
              ${version.id}, ${parseInt(proposalId)}, ${versionNumber},
              ${version.title}, ${version.description}, ${version.updateMessage},
              ${BigInt(version.createdAt)}
            )
          `;
          results.inserted++;
        }
      } catch (error) {
        console.error(`Error syncing proposal version ${version.id}:`, error);
      }
    }
  }
  
  return results;
}

async function syncCandidates(sql: SqlFunction): Promise<{ inserted: number; updated: number }> {
  const results = { inserted: 0, updated: 0 };
  
  // Fetch all candidates from Goldsky
  const candidates = await fetchAllPaginated<CandidateData>(CANDIDATES_QUERY, 'proposalCandidates', 1000);
  
  for (const candidate of candidates) {
    const id = candidate.id;
    const proposer = candidate.proposer.toLowerCase();
    const title = candidate.latestVersion?.content?.title || null;
    const description = candidate.latestVersion?.content?.description || null;
    const signatureCount = candidate.latestVersion?.content?.contentSignatures?.length || 0;
    
    try {
      const existing = await sql`SELECT id FROM legacy_candidates WHERE id = ${id}` as { id: string }[];
      
      if (existing.length === 0) {
        await sql`
          INSERT INTO legacy_candidates (
            id, slug, proposer, title, description, canceled,
            created_timestamp, last_updated_timestamp, signature_count
          ) VALUES (
            ${id}, ${candidate.slug}, ${proposer}, ${title}, ${description}, ${candidate.canceled},
            ${BigInt(candidate.createdTimestamp)}, ${BigInt(candidate.lastUpdatedTimestamp)},
            ${signatureCount}
          )
        `;
        results.inserted++;
      } else {
        await sql`
          UPDATE legacy_candidates SET
            title = ${title},
            description = ${description},
            canceled = ${candidate.canceled},
            last_updated_timestamp = ${BigInt(candidate.lastUpdatedTimestamp)},
            signature_count = ${signatureCount},
            updated_at = NOW()
          WHERE id = ${id}
        `;
        results.updated++;
      }
    } catch (error) {
      console.error(`Error syncing candidate ${id}:`, error);
    }
  }
  
  return results;
}

async function syncCandidateVersions(sql: SqlFunction): Promise<{ inserted: number }> {
  const results = { inserted: 0 };
  
  // Fetch all candidate versions from Goldsky
  const versions = await fetchAllPaginated<CandidateVersionData>(CANDIDATE_VERSIONS_QUERY, 'proposalCandidateVersions', 2000);
  
  // Group by candidate to calculate version numbers
  const versionsByCandidate = new Map<string, CandidateVersionData[]>();
  for (const version of versions) {
    const candidateId = version.proposal.id;
    if (!versionsByCandidate.has(candidateId)) {
      versionsByCandidate.set(candidateId, []);
    }
    versionsByCandidate.get(candidateId)!.push(version);
  }
  
  // Sort each candidate's versions by createdTimestamp and assign version numbers
  for (const [candidateId, candVersions] of versionsByCandidate) {
    candVersions.sort((a, b) => parseInt(a.createdTimestamp) - parseInt(b.createdTimestamp));
    
    for (let i = 0; i < candVersions.length; i++) {
      const version = candVersions[i];
      const versionNumber = i + 1;
      
      try {
        // Check if candidate exists first
        const candidateExists = await sql`SELECT id FROM legacy_candidates WHERE id = ${candidateId}` as { id: string }[];
        if (candidateExists.length === 0) continue;
        
        const existing = await sql`SELECT id FROM legacy_candidate_versions WHERE id = ${version.id}` as { id: string }[];
        
        if (existing.length === 0) {
          await sql`
            INSERT INTO legacy_candidate_versions (
              id, candidate_id, version_number, title, description, update_message, created_at
            ) VALUES (
              ${version.id}, ${candidateId}, ${versionNumber},
              ${version.content.title}, ${version.content.description}, ${version.updateMessage},
              ${BigInt(version.createdTimestamp)}
            )
          `;
          results.inserted++;
        }
      } catch (error) {
        console.error(`Error syncing candidate version ${version.id}:`, error);
      }
    }
  }
  
  return results;
}

// ============================================================================
// Main Handler
// ============================================================================

export async function GET(request: NextRequest) {
  // Verify cron secret for security
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const startTime = Date.now();
  const results = {
    voters: { inserted: 0, updated: 0 },
    accounts: { inserted: 0, updated: 0 },
    proposals: { inserted: 0, updated: 0 },
    proposalVersions: { inserted: 0 },
    candidates: { inserted: 0, updated: 0 },
    candidateVersions: { inserted: 0 },
    duration: 0,
    errors: [] as string[],
  };

  try {
    const sql = neon(process.env.DATABASE_URL!);

    // Sync voters (delegates) with ENS names
    console.log('[Sync Camp] Syncing voters (delegates)...');
    try {
      results.voters = await syncVoters(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing voters:', error);
      results.errors.push(`voters: ${String(error)}`);
    }

    // Sync accounts (Noun holders who may have delegated)
    console.log('[Sync Camp] Syncing accounts (Noun holders)...');
    try {
      results.accounts = await syncAccounts(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing accounts:', error);
      results.errors.push(`accounts: ${String(error)}`);
    }

    // Sync proposals
    console.log('[Sync Camp] Syncing proposals...');
    try {
      results.proposals = await syncProposals(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing proposals:', error);
      results.errors.push(`proposals: ${String(error)}`);
    }

    // Sync proposal versions
    console.log('[Sync Camp] Syncing proposal versions...');
    try {
      results.proposalVersions = await syncProposalVersions(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing proposal versions:', error);
      results.errors.push(`proposalVersions: ${String(error)}`);
    }

    // Sync candidates
    console.log('[Sync Camp] Syncing candidates...');
    try {
      results.candidates = await syncCandidates(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing candidates:', error);
      results.errors.push(`candidates: ${String(error)}`);
    }

    // Sync candidate versions
    console.log('[Sync Camp] Syncing candidate versions...');
    try {
      results.candidateVersions = await syncCandidateVersions(sql);
    } catch (error) {
      console.error('[Sync Camp] Error syncing candidate versions:', error);
      results.errors.push(`candidateVersions: ${String(error)}`);
    }

    // Update sync state
    await sql`
      INSERT INTO sync_state (key, value, updated_at)
      VALUES ('camp_last_sync', ${new Date().toISOString()}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    results.duration = Date.now() - startTime;

    console.log('[Sync Camp] Complete:', results);

    return NextResponse.json({
      success: true,
      message: 'Sync complete',
      results,
    });
  } catch (error) {
    console.error('[Sync Camp] Fatal error:', error);
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}
