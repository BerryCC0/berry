/**
 * versionDedup — generic helper for the "skip the first version of each
 * parent" filter shared by proposal_updated and candidate_updated.
 *
 * The first version row for any (proposal | candidate) is its CREATION, not
 * an update — we surface those via the dedicated `*_created` activity types
 * and don't want to also emit them as `*_updated`. Subsequent versions are
 * real updates.
 *
 * Source: extracted from `useActivityFeed.ts:624-639` (proposalVersions)
 * and `useActivityFeed.ts:681-696` (candidateVersions). Behavior preserved
 * byte-equal: same Map-build pass, same string-compare on timestamps (not
 * numeric — preserved intentionally to avoid changing edge-case ordering).
 */

/**
 * Filter out the earliest version per parent. The result preserves input
 * order and excludes rows whose timestamp equals the parent's earliest.
 *
 * @param rows           Version rows.
 * @param getParentId    Extract the parent id (proposal_id / candidate_id).
 * @param getTimestamp   Extract the row's block timestamp as a string.
 *                       String comparison is used to match legacy behavior.
 */
export function dedupeFirstVersion<T>(
  rows: T[],
  getParentId: (row: T) => string,
  getTimestamp: (row: T) => string,
): T[] {
  // First pass: record the earliest timestamp per parent.
  const firstVersionByParent = new Map<string, string>();
  for (const row of rows) {
    const parent = getParentId(row);
    const ts = getTimestamp(row);
    const existing = firstVersionByParent.get(parent);
    if (!existing || ts < existing) {
      firstVersionByParent.set(parent, ts);
    }
  }

  // Second pass: drop rows that are the earliest for their parent.
  return rows.filter((row) => {
    const parent = getParentId(row);
    const ts = getTimestamp(row);
    return ts !== firstVersionByParent.get(parent);
  });
}
