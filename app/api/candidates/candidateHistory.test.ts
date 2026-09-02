import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const query = vi.hoisted(() => vi.fn());
vi.mock('@/app/lib/ponder-db', () => ({ ponderSql: () => query }));

import { GET as getById } from './[id]/route';
import { GET as getBySlug } from './route';

const candidate = {
  id: '0xabc-candidate', slug: 'candidate', proposer: '0xabc', title: 'Title',
};
const versions = [{
  id: '0xtx-2', candidate_id: candidate.id, version_number: 2,
  targets: ['0xdef'], values: ['1000000000000000001'],
  signatures: [''], calldatas: ['0x1234'], encoded_proposal_hash: '0xhash',
  proposal_id_to_update: 42, tx_hash: '0xtx', log_index: 2,
}];

beforeEach(() => {
  query.mockReset();
  query.mockImplementation(async (parts: TemplateStringsArray) => {
    const sql = parts.join('?');
    if (sql.includes('FROM ponder_live.candidate_versions')) return versions;
    if (sql.includes('FROM ponder_live.candidates c')) return [candidate];
    return [];
  });
});

describe('candidate history detail API contract', () => {
  it('returns the full version content from the ID route', async () => {
    const response = await getById(new NextRequest('https://example.com/api/candidates/0xabc-candidate'), {
      params: Promise.resolve({ id: candidate.id }),
    });
    expect(response.status).toBe(200);
    expect((await response.json()).candidate.versions).toEqual(versions);
  });

  it('returns the same history from the clean slug route', async () => {
    const response = await getBySlug(new NextRequest('https://example.com/api/candidates?slug=candidate'));
    expect(response.status).toBe(200);
    expect((await response.json()).candidate.versions).toEqual(versions);
  });
});
