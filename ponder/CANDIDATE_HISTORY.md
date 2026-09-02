# Candidate history — 2026-08-31

Status: implemented and tested locally; not deployed or backfilled.

## Stored contract

`candidate_versions` now records a complete immutable snapshot for every
`ProposalCandidateCreated` and `ProposalCandidateUpdated` event:

| Field group | Stored values |
| --- | --- |
| Identity | `id = transactionHash-logIndex`, `candidateId`, per-candidate `versionNumber` |
| Content | `title`, exact `description`, `targets`, `values`, `signatures`, `calldatas` |
| Matching | Exact event `encodedProposalHash`, nullable `proposalIdToUpdate` |
| Provenance | `blockNumber`, `blockTimestamp`, `txHash`, `logIndex`, update reason |

Version **1** is creation; subsequent versions are 2, 3, and so on. This is a
version ordinal within one candidate, not Camp's global candidate number.
Amounts remain decimal strings. Empty transaction arrays remain empty arrays.
An update changes the current candidate row but never an older snapshot.

`candidates.versionCount` tracks the latest ordinal. Creation block and timestamp
remain unchanged on edits. Separate creation, last-update, and cancellation
transaction hashes are retained, along with `lastUpdatedBlock`. The update handler
now also refreshes `proposalIdToUpdate`, which previously stayed at its original
value.

The original candidate ID (`lowercase-proposer-slug`), current content fields,
and existing GraphQL relation `candidates.versions` remain intact. No ABI or
contract-writing code changed.

## Berry readers

Both `/api/candidates/[id]` and `/api/candidates?slug=...` now return complete
version rows, newest first, through `app/lib/candidateVersions.ts`. The shared
reader selects the row and orders using existing columns, so it also works with
the old deployed schema while the new indexer catches up. `useCandidates`
preserves the history as `Candidate.versions`; missing historical fields remain
unknown rather than being replaced with fabricated empty transaction arrays.

Candidate update activity excludes version 1 explicitly. Legacy version-0 rows
remain valid updates. It no longer discards the earliest row in an arbitrary
time window, which could hide the first real update or multiple edits from the
same block. Existing behavior that omits updates with blank reasons is preserved.

## Rollout and historical recovery

1. Deploy the indexer changes using its existing isolated deployment schema.
   `Dockerfile` uses the Railway deployment ID and publishes `ponder_live` views
   only when that deployment has caught up. Do not manually alter or drop the
   current live tables.
2. Replay from the configured contract start blocks. NounsDAOData starts at
   **17,812,145**. Its creation and update event payloads contain the missing
   history. Adding columns alone cannot reconstruct it; copying today's content
   into old versions would produce false history.
3. Once indexing is complete, run the read-only checks in
   `scripts/verify-candidate-history.sql`. Each query should return zero rows.
   Spot-check an edited candidate against transaction logs, including a change
   of target proposal and an edit that removed actions.
4. Verify both detail URL formats and the activity feed in Berry. The reader
   changes are compatible with old version-0 rows, but complete snapshots are
   available only after the new deployment becomes live.
5. Capture the deployed GraphQL schema from
   `https://ponder.berryos.wtf/graphql` before beginning Camp's adapter migration.

At audit time both that custom domain and
`https://berry-ponder-production.up.railway.app/graphql` returned HTTP 502 with
Railway's `Application failed to respond`. No deployment, production SQL, replay,
or historical-data verification was performed during this local change.

## Verification

`npm test` at the Berry root passes **185 tests in 28 files**, including 11 new
regressions covering event snapshots, same-block edits, metadata, missing creation,
both detail endpoints, activity windows, and legacy response mapping. Frontend
and Ponder `tsc --noEmit` both pass. Targeted frontend lint has zero errors and
the pre-existing `_skip` warning in `useCandidates.ts`.

Indexer tests run through the root Vitest configuration and mock registration,
storage, and ENS resolution. They do not connect to Ethereum or Postgres. They
are excluded from the standalone Ponder TypeScript project so its production
dependency installation does not require Vitest. A live replay remains the final
integration check.

## Still outside this fix

Camp's global numeric candidate permalinks, historical feedback voting power,
signature cancellation joins, and the Camp-shaped `latestVersion.content` adapter
remain separate migration work. No claim of full Camp provider parity is made by
this schema change. The workspace's separate SQLite snapshot script was not
changed or run; its field mappings must be extended before treating that mirror
as a source for the newly indexed snapshot content.
