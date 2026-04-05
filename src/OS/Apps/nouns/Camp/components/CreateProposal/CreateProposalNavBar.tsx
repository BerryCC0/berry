/**
 * CreateProposalNavBar
 * Header navigation section with back button, page title, draft status, and edit indicator
 */

import React from 'react';
import styles from './CreateProposalNavBar.module.css';

interface CreateProposalNavBarProps {
  onBack: () => void;
  title: string;
  isEditingProposal: boolean;
  isEditingCandidate: boolean;
  editCandidateSlug?: string;
  editProposalId?: string;
  draftTitle: string;
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  lastSaved: Date | null;
  isEditMode: boolean;
}

function formatRelativeTime(date: Date | undefined): string {
  if (!date) return '';

  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(date).toLocaleDateString();
}

export function CreateProposalNavBar({
  onBack,
  title,
  isEditingProposal,
  isEditingCandidate,
  editCandidateSlug,
  editProposalId,
  draftTitle,
  saveStatus,
  lastSaved,
  isEditMode,
}: CreateProposalNavBarProps) {
  return (
    <div className={styles.navBar}>
      <button className={styles.backButton} onClick={onBack}>
        ← Back
      </button>
      <h2 className={styles.pageTitle}>
        {isEditingProposal ? 'Edit Proposal' : isEditingCandidate ? 'Edit Candidate' : title || 'Create'}
      </h2>

      {!isEditMode && draftTitle && (
        <div className={styles.draftIndicator}>
          <span className={styles.draftName}>Draft: {draftTitle}</span>
          <span className={styles.separator}>|</span>
          {saveStatus === 'saving' && <span className={styles.savingIndicator}>Saving...</span>}
          {saveStatus === 'saved' && lastSaved && (
            <span className={styles.savedIndicator}>Saved {formatRelativeTime(lastSaved)}</span>
          )}
          {saveStatus === 'unsaved' && <span className={styles.unsavedIndicator}>Unsaved</span>}
          {saveStatus === 'error' && <span className={styles.errorIndicator}>Save failed</span>}
        </div>
      )}

      {isEditingCandidate && editCandidateSlug && (
        <div className={styles.editIndicator}>
          <span className={styles.editSlug}>/{editCandidateSlug}</span>
        </div>
      )}

      {isEditingProposal && editProposalId && (
        <div className={styles.editIndicator}>
          <span className={styles.editSlug}>Proposal #{editProposalId}</span>
        </div>
      )}
    </div>
  );
}
