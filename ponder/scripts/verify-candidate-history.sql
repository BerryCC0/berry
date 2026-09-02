-- Read-only post-replay checks. Every query should return zero rows.
-- Run against the live views only after the new indexer has caught up.

-- Every candidate has one creation plus a contiguous sequence of snapshots.
SELECT c.id, c.version_count, h.snapshot_count, h.first_version, h.last_version
FROM ponder_live.candidates c
LEFT JOIN (
  SELECT candidate_id, COUNT(*) AS snapshot_count,
         COUNT(DISTINCT version_number) AS unique_versions,
         MIN(version_number) AS first_version, MAX(version_number) AS last_version
  FROM ponder_live.candidate_versions
  GROUP BY candidate_id
) h ON h.candidate_id = c.id
WHERE h.snapshot_count IS NULL
   OR h.first_version <> 1
   OR h.last_version <> c.version_count
   OR h.snapshot_count <> c.version_count
   OR h.unique_versions <> h.snapshot_count;

-- Snapshot order follows chain event order, including multiple edits in one block.
SELECT id, candidate_id, version_number, expected_version
FROM (
  SELECT id, candidate_id, version_number,
         ROW_NUMBER() OVER (
           PARTITION BY candidate_id ORDER BY block_number, log_index
         ) AS expected_version
  FROM ponder_live.candidate_versions
) ordered_versions
WHERE version_number <> expected_version;

-- Content is complete, and the parallel action arrays still align.
SELECT id, candidate_id
FROM ponder_live.candidate_versions
WHERE targets IS NULL OR "values" IS NULL OR signatures IS NULL OR calldatas IS NULL
   OR encoded_proposal_hash IS NULL OR tx_hash IS NULL OR log_index IS NULL
   OR jsonb_array_length(targets::jsonb) <> jsonb_array_length("values"::jsonb)
   OR jsonb_array_length(targets::jsonb) <> jsonb_array_length(signatures::jsonb)
   OR jsonb_array_length(targets::jsonb) <> jsonb_array_length(calldatas::jsonb);

-- The current candidate and its latest snapshot describe identical content.
SELECT c.id
FROM ponder_live.candidates c
JOIN ponder_live.candidate_versions v
  ON v.candidate_id = c.id AND v.version_number = c.version_count
WHERE c.description IS DISTINCT FROM v.description
   OR c.encoded_proposal_hash IS DISTINCT FROM v.encoded_proposal_hash
   OR c.proposal_id_to_update IS DISTINCT FROM v.proposal_id_to_update
   OR c.targets::jsonb IS DISTINCT FROM v.targets::jsonb
   OR c."values"::jsonb IS DISTINCT FROM v."values"::jsonb
   OR c.signatures::jsonb IS DISTINCT FROM v.signatures::jsonb
   OR c.calldatas::jsonb IS DISTINCT FROM v.calldatas::jsonb
   OR c.last_updated_block IS DISTINCT FROM v.block_number
   OR c.last_updated_timestamp IS DISTINCT FROM v.block_timestamp
   OR c.last_updated_tx_hash IS DISTINCT FROM v.tx_hash;
