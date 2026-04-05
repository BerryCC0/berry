/**
 * TypeDraftsSection
 * Proposal type selector and draft management row
 */

import React from 'react';
import { Select } from '@/OS/Primitives/Select/Select';
import { DraftSelector } from './DraftSelector';
import type { ProposalDraft } from '../../utils/types';
import styles from './TypeDraftsSection.module.css';

interface TypeDraftsSectionProps {
  proposalType: 'standard' | 'timelock_v1' | 'candidate';
  onProposalTypeChange: (type: 'standard' | 'timelock_v1' | 'candidate') => void;
  drafts: ProposalDraft[];
  currentDraft: ProposalDraft | null;
  onLoadDraft: (draft: ProposalDraft) => void;
  onDeleteDraft: (draftSlug: string) => void;
  onRenameDraft: (draftSlug: string, newTitle: string) => void;
  onNewDraft: () => void;
  hasVotingPower: boolean;
  candidateCost: bigint | undefined;
  isCreating: boolean;
}

export function TypeDraftsSection({
  proposalType,
  onProposalTypeChange,
  drafts,
  currentDraft,
  onLoadDraft,
  onDeleteDraft,
  onRenameDraft,
  onNewDraft,
  hasVotingPower,
  candidateCost,
  isCreating,
}: TypeDraftsSectionProps) {
  return (
    <div className={styles.typeDraftsRow}>
      {/* Proposal Type - Left */}
      <div className={styles.typeColumn}>
        <label className={styles.label}>Proposal Type *</label>
        <Select
          options={[
            {
              value: 'candidate',
              label: 'Candidate',
              description: 'Gather community support before formal submission',
            },
            {
              value: 'standard',
              label: 'Standard Proposal',
              description: 'Submit directly to onchain voting (requires 4 Nouns)',
            },
            {
              value: 'timelock_v1',
              label: 'Timelock V1 Proposal',
              description: 'For legacy proposals using Timelock V1',
            },
          ]}
          value={proposalType}
          onChange={(value) => onProposalTypeChange(value as 'candidate' | 'standard' | 'timelock_v1')}
          disabled={isCreating}
        />

        {proposalType === 'candidate' && !hasVotingPower && candidateCost && (
          <div className={styles.helpText}>
            <span className={styles.feeNotice}>
              Fee: {(Number(candidateCost) / 1e18).toFixed(4)} ETH (waived for Noun owners)
            </span>
          </div>
        )}

        {proposalType !== 'candidate' && !hasVotingPower && (
          <div className={styles.warningText}>
            You need at least 4 Nouns to submit a proposal.
            Consider creating a candidate instead.
          </div>
        )}
      </div>

      {/* Draft Management - Right */}
      <div className={styles.draftsColumn}>
        <DraftSelector
          drafts={drafts}
          currentDraft={currentDraft}
          onLoad={onLoadDraft}
          onDelete={onDeleteDraft}
          onRename={onRenameDraft}
          onNew={onNewDraft}
          disabled={isCreating}
        />
      </div>
    </div>
  );
}
