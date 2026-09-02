import { beforeEach, describe, expect, it, vi } from 'vitest';

const handlers = vi.hoisted(() => new Map<string, (args: unknown) => Promise<void>>());

vi.mock('ponder:registry', () => ({
  ponder: {
    on: (name: string, handler: (args: unknown) => Promise<void>) => handlers.set(name, handler),
  },
}));
vi.mock('ponder:schema', () => Object.fromEntries([
  'candidates', 'candidateVersions', 'candidateSignatures', 'proposalFeedback',
  'candidateFeedback', 'complianceSignals', 'dunaMessages', 'dataConfigChanges',
].map((name) => [name, name])));
vi.mock('../src/helpers/ens', () => ({
  extractTitle: (description: string) => description.split('\n')[0].replace(/^#+\s*/, ''),
  resolveAndStoreEns: vi.fn(),
}));

import '../src/governance/NounsDAOData';

type Row = { id: string; [key: string]: unknown };

// A small in-memory store stand-in: rows are copied just as persisted JSON
// is, so an update cannot accidentally rewrite an earlier version in memory.
function createDb() {
  const tables = new Map<string, Map<string, Row>>();
  const tableRows = (table: string) => {
    if (!tables.has(table)) tables.set(table, new Map());
    return tables.get(table)!;
  };
  return {
    rows: (table: string) => [...tableRows(table).values()],
    find: async (table: string, key: { id: string }) => tableRows(table).get(key.id) ?? null,
    insert: (table: string) => ({
      values: (row: Row) => {
        const write = async () => {
          if (!tableRows(table).has(row.id)) tableRows(table).set(row.id, structuredClone(row));
        };
        return { then: (resolve: () => void) => write().then(resolve), onConflictDoNothing: write };
      },
    }),
    update: (table: string, key: { id: string }) => ({
      set: async (patch: Record<string, unknown>) => {
        const row = tableRows(table).get(key.id);
        if (!row) throw new Error('Missing row');
        tableRows(table).set(key.id, structuredClone({ ...row, ...patch }));
      },
    }),
  };
}

const proposer = '0x00000000000000000000000000000000000000ab';
const hash = (digit: string) => `0x${digit.repeat(64)}`;
const makeEvent = (logIndex: number, overrides = {}) => ({
  args: {
    msgSender: proposer,
    slug: 'candidate-with-hyphens',
    description: '# Original\nOriginal body',
    targets: [proposer],
    values: [123456789012345678901234567890n],
    signatures: ['send()'],
    calldatas: ['0x1234'],
    encodedProposalHash: hash('1'),
    proposalIdToUpdate: 0n,
    reason: 'Explain update',
    ...overrides,
  },
  block: { number: 100n, timestamp: 1000n },
  transaction: { hash: hash('2') },
  log: { logIndex },
});

describe('candidate event history', () => {
  let db: ReturnType<typeof createDb>;
  beforeEach(() => { db = createDb(); });
  const run = (name: string, event: ReturnType<typeof makeEvent>, database: ReturnType<typeof createDb>) =>
    handlers.get(`NounsDAOData:${name}`)!({ event, context: { db: database } });

  it('retains creation plus every complete snapshot, even for edits in the same block', async () => {
    await run('ProposalCandidateCreated', makeEvent(1), db);
    const original = structuredClone(db.rows('candidateVersions')[0]);
    await run('ProposalCandidateUpdated', makeEvent(2, {
      description: '# Edited\nEdited body', targets: [], values: [], signatures: [], calldatas: [],
      encodedProposalHash: hash('3'), proposalIdToUpdate: 42n,
    }), db);
    await run('ProposalCandidateUpdated', makeEvent(3, {
      description: '# Final', encodedProposalHash: hash('4'), proposalIdToUpdate: 0n,
    }), db);

    const versions = db.rows('candidateVersions');
    expect(versions.map((v) => v.versionNumber)).toEqual([1, 2, 3]);
    expect(versions[0]).toEqual(original);
    expect(versions[0]).toMatchObject({
      values: ['123456789012345678901234567890'], updateMessage: null,
      txHash: hash('2'), logIndex: 1, encodedProposalHash: hash('1'),
    });
    expect(versions[1]).toMatchObject({
      targets: [], values: [], signatures: [], calldatas: [],
      proposalIdToUpdate: 42, encodedProposalHash: hash('3'), logIndex: 2,
    });
    expect(db.rows('candidates')[0]).toMatchObject({
      versionCount: 3, description: '# Final', proposalIdToUpdate: null,
      encodedProposalHash: hash('4'), blockNumber: 100n, lastUpdatedBlock: 100n,
      createdTxHash: hash('2'), lastUpdatedTxHash: hash('2'),
    });
  });

  it('keeps version numbering local to a candidate and cancellation does not erase history', async () => {
    await run('ProposalCandidateCreated', makeEvent(1), db);
    await run('ProposalCandidateUpdated', makeEvent(2), db);
    await run('ProposalCandidateCreated', makeEvent(3, { slug: 'another' }), db);
    const beforeCancel = structuredClone(db.rows('candidateVersions'));
    await run('ProposalCandidateCanceled', makeEvent(4), db);
    expect(db.rows('candidateVersions')).toEqual(beforeCancel);
    expect(db.rows('candidates').map((c) => c.versionCount)).toEqual([2, 1]);
    expect(db.rows('candidates')[0]).toMatchObject({ canceled: true, canceledTxHash: hash('2') });
  });

  it('fails instead of fabricating complete history when creation was not indexed', async () => {
    await expect(run('ProposalCandidateUpdated', makeEvent(2), db)).rejects.toThrow('creation missing');
    expect(db.rows('candidateVersions')).toEqual([]);
  });

  it('keeps creation metadata while recording the block and transaction of a later edit', async () => {
    await run('ProposalCandidateCreated', makeEvent(1), db);
    await run('ProposalCandidateUpdated', {
      ...makeEvent(2),
      block: { number: 200n, timestamp: 2000n },
      transaction: { hash: hash('9') },
    }, db);
    expect(db.rows('candidates')[0]).toMatchObject({
      blockNumber: 100n, createdTimestamp: 1000n, createdTxHash: hash('2'),
      lastUpdatedBlock: 200n, lastUpdatedTimestamp: 2000n, lastUpdatedTxHash: hash('9'),
    });
    expect(db.rows('candidateVersions')[1]).toMatchObject({
      blockNumber: 200n, blockTimestamp: 2000n, txHash: hash('9'),
    });
  });
});
