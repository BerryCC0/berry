/**
 * Activity definition: signature_canceled
 *
 * Surfaces `SignatureCancelled` events from the NounsDAO governor contract.
 * The event payload is just `(signer, sig)` — the contract doesn't know what
 * the signature was originally for. We LEFT JOIN to `candidate_signatures` on
 * `(signer, sig)` to recover candidate context when the canceled sig had been
 * registered as a sponsorship. When the JOIN misses, the sig is presumed to
 * be a proposal-level signature (used directly via `proposeBySigs`) — those
 * never get indexed as additions, so cancellation is the only on-chain trace.
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiCancelledSignatureRow {
  id: string;
  signer: string;
  signer_ens: string | null;
  block_timestamp: string;
  // The following four are populated only when the canceled sig matches a
  // candidate sponsorship row. Null otherwise — see signatureKind below.
  candidate_slug: string | null;
  candidate_proposer: string | null;
  candidate_title: string | null;
  candidate_id: string | null;
}

export const signatureCanceledDefinition: ActivityDefinition<ApiCancelledSignatureRow> = {
  type: 'signature_canceled',
  producerKey: 'cancelledSignatures',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT cx.id, cx.signer, cx.block_timestamp,
               cs.candidate_id, cs.slug as candidate_slug,
               cs.proposer as candidate_proposer,
               c.title as candidate_title,
               e.name as signer_ens
        FROM ponder_live.cancelled_signatures cx
        LEFT JOIN ponder_live.candidate_signatures cs
          ON cs.sig = cx.sig AND LOWER(cs.signer) = LOWER(cx.signer)
        LEFT JOIN ponder_live.candidates c ON cs.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(cx.signer) = LOWER(e.address)
        WHERE cx.block_timestamp >= ${since}
        ORDER BY cx.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((r) => {
      const isCandidateSig = Boolean(r.candidate_id);
      return {
        id: `signature-canceled-${r.id}`,
        type: 'signature_canceled' as const,
        timestamp: String(r.block_timestamp),
        actor: r.signer,
        actorEns: r.signer_ens || undefined,
        signatureKind: isCandidateSig ? 'candidate' : 'proposal',
        // Populated only when isCandidateSig — UI falls back to "a proposal
        // signature" copy when these are undefined.
        candidateSlug: r.candidate_slug || undefined,
        candidateTitle: r.candidate_title || undefined,
        candidateProposer: r.candidate_proposer || undefined,
      };
    }),
};
