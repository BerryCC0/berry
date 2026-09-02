import type { CandidateVersion } from '../types';

export interface ApiCandidateVersionRow {
  id: string;
  version_number: number;
  title: string | null;
  description: string | null;
  targets?: string[] | null;
  values?: string[] | null;
  signatures?: string[] | null;
  calldatas?: string[] | null;
  encoded_proposal_hash?: string | null;
  proposal_id_to_update?: number | string | null;
  update_message: string | null;
  block_number: number | string;
  block_timestamp: number | string;
  tx_hash?: string | null;
  log_index?: number | null;
}

export function mapCandidateVersion(row: ApiCandidateVersionRow): CandidateVersion {
  return {
    id: row.id,
    versionNumber: row.version_number,
    title: row.title || undefined,
    description: row.description ?? '',
    // Do not invent empty action arrays for legacy, incomplete snapshots.
    targets: row.targets ?? undefined,
    values: row.values ?? undefined,
    signatures: row.signatures ?? undefined,
    calldatas: row.calldatas ?? undefined,
    encodedProposalHash: row.encoded_proposal_hash ?? undefined,
    proposalIdToUpdate: row.proposal_id_to_update == null
      ? undefined
      : String(row.proposal_id_to_update),
    updateMessage: row.update_message ?? undefined,
    blockNumber: String(row.block_number),
    blockTimestamp: String(row.block_timestamp),
    transactionHash: row.tx_hash ?? undefined,
    logIndex: row.log_index ?? undefined,
  };
}
