import { describe, expect, it } from 'vitest';
import { mapCandidateVersion } from './candidateVersions';

const legacyRow = {
  id: 'tx-1', version_number: 0, title: 'Title', description: 'Body',
  update_message: 'Update', block_number: '100', block_timestamp: '1000',
};

describe('candidate version mapping', () => {
  it('preserves full content, integer precision and zero-valued log indexes', () => {
    const version = mapCandidateVersion({
      ...legacyRow, version_number: 1, targets: ['0xabc'],
      values: ['123456789012345678901234567890'], signatures: [''], calldatas: ['0x'],
      encoded_proposal_hash: '0xhash', proposal_id_to_update: 42,
      tx_hash: '0xtx', log_index: 0,
    });
    expect(version).toMatchObject({
      versionNumber: 1, values: ['123456789012345678901234567890'],
      signatures: [''], calldatas: ['0x'], encodedProposalHash: '0xhash',
      proposalIdToUpdate: '42', transactionHash: '0xtx', logIndex: 0,
    });
  });

  it('leaves missing legacy content unknown instead of creating an empty transaction set', () => {
    const version = mapCandidateVersion(legacyRow);
    expect(version.description).toBe('Body');
    expect(version.targets).toBeUndefined();
    expect(version.values).toBeUndefined();
    expect(version.encodedProposalHash).toBeUndefined();
  });
});
