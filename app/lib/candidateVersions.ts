import type { ponderSql } from './ponder-db';

/** Complete history for both ID and slug candidate detail routes. */
export function getCandidateVersions(sql: ReturnType<typeof ponderSql>, candidateId: string) {
  // Selecting the row keeps this reader compatible with the old deployment
  // during reindexing: old rows lack the new content fields and have version 0.
  return sql`
    SELECT cv.*
    FROM ponder_live.candidate_versions cv
    WHERE cv.candidate_id = ${candidateId}
    ORDER BY cv.block_number DESC, cv.version_number DESC, cv.id DESC
  `;
}
