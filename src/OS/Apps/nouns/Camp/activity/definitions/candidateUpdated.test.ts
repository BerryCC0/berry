import { describe, expect, it } from 'vitest';
import { candidateUpdatedDefinition } from './candidateUpdated';

const row = (version: number, id = String(version)) => ({
  id, candidate_id: '0xabc-proposal', version_number: version,
  title: 'Title', update_message: 'Changed transactions', block_timestamp: '1000',
  candidate_slug: 'proposal', candidate_proposer: '0xabc', proposer_ens: null,
});
const context = { nowSeconds: 1001 };

describe('candidate update activity', () => {
  it('keeps a single real update when creation is outside the requested window', () => {
    const items = candidateUpdatedDefinition.processRows([row(4)], context);
    expect(items.map((item) => item.id)).toEqual(['candidate-updated-4']);
  });

  it('excludes creation without dropping updates from the same timestamp', () => {
    const items = candidateUpdatedDefinition.processRows([row(3), row(2), row(1)], context);
    expect(items.map((item) => item.id)).toEqual(['candidate-updated-3', 'candidate-updated-2']);
  });

  it('preserves legacy version-zero updates during rollout and still omits blank messages', () => {
    const items = candidateUpdatedDefinition.processRows([
      row(0), { ...row(2), update_message: '   ' },
    ], context);
    expect(items.map((item) => item.id)).toEqual(['candidate-updated-0']);
  });
});
