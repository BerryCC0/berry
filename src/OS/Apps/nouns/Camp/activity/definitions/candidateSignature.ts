/**
 * Activity definition: candidate_sponsored
 *
 * Surfaces `SignatureAdded` events from the NounsDAOData proxy as "X sponsored
 * candidate Y" items. The EIP-712 signature carries an `expirationTimestamp`
 * that we propagate to the item so the UI can render expiration state. There
 * is no on-chain way to cancel an individual candidate signature — the only
 * cancellation paths are the whole candidate being canceled by its proposer,
 * or the underlying NounsDAO `SignatureCancelled` event (surfaced as the
 * separate `signature_canceled` activity type via `signatureCanceled.ts`).
 */

import type { ActivityDefinition } from '../types';
import type { ActivityItem } from '../../types';

interface ApiCandidateSignatureRow {
  id: string;
  signer: string;
  signer_ens: string | null;
  candidate_id: string;
  reason: string | null;
  block_timestamp: string;
  expiration_timestamp: string;
  candidate_slug: string;
  candidate_proposer: string;
  candidate_title: string;
}

export const candidateSignatureDefinition: ActivityDefinition<ApiCandidateSignatureRow> = {
  type: 'candidate_sponsored',
  producerKey: 'candidateSignatures',
  buildQuery: ({ sql, since, limit }) => sql`
        SELECT cs.id, cs.signer, cs.candidate_id, cs.reason, cs.block_timestamp,
               cs.expiration_timestamp,
               c.slug as candidate_slug, c.proposer as candidate_proposer,
               c.title as candidate_title,
               e.name as signer_ens
        FROM ponder_live.candidate_signatures cs
        LEFT JOIN ponder_live.candidates c ON cs.candidate_id = c.id
        LEFT JOIN ponder_live.ens_names e ON LOWER(cs.signer) = LOWER(e.address)
        WHERE cs.block_timestamp >= ${since}
        ORDER BY cs.block_timestamp DESC
        LIMIT ${limit}
      `,
  processRows: (rows): ActivityItem[] =>
    rows.map((s) => ({
      id: `candidate-sponsored-${s.id}`,
      type: 'candidate_sponsored' as const,
      timestamp: String(s.block_timestamp),
      actor: s.signer,
      actorEns: s.signer_ens || undefined,
      candidateSlug: s.candidate_slug,
      candidateTitle: s.candidate_title,
      candidateProposer: s.candidate_proposer,
      reason: s.reason || undefined,
      expirationTimestamp: String(s.expiration_timestamp),
    })),
};
