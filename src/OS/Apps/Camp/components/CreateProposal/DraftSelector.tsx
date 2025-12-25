/**
 * DraftSelector Component
 * UI for loading and managing saved proposal drafts
 */

'use client';

import React, { useState } from 'react';
import type { ProposalDraft } from '../../utils/types';
import styles from './DraftSelector.module.css';

interface DraftSelectorProps {
  drafts: ProposalDraft[];
  currentDraft: ProposalDraft | null;
  onLoad: (draft: ProposalDraft) => void;
  onDelete: (draftSlug: string) => void;
  onRename: (draftSlug: string, newTitle: string) => void;
  onNew: () => void;
  disabled?: boolean;
}

export function DraftSelector({
  drafts,
  currentDraft,
  onLoad,
  onDelete,
  onRename,
  onNew,
  disabled = false,
}: DraftSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [editingDraftSlug, setEditingDraftSlug] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const formatRelativeTime = (date: Date | undefined) => {
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
  };

  const startRename = (draftSlug: string, currentTitle: string) => {
    setEditingDraftSlug(draftSlug);
    setEditingTitle(currentTitle);
  };

  const handleRename = (draftSlug: string, newTitle: string) => {
    if (newTitle.trim() && newTitle.trim() !== currentDraft?.draft_title) {
      onRename(draftSlug, newTitle.trim());
    }
    setEditingDraftSlug(null);
    setEditingTitle('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>
          {drafts.length === 0 ? 'No Drafts Yet' : 'Saved Drafts'}
          {drafts.length > 0 && <span className={styles.count}> ({drafts.length})</span>}
        </label>
        <button
          type="button"
          className={styles.newButton}
          onClick={onNew}
          disabled={disabled}
        >
          + New Proposal
        </button>
      </div>

      {drafts.length === 0 ? (
        <div className={styles.noDrafts}>
          Start typing a proposal title to create your first draft. It will auto-save as you type!
        </div>
      ) : (
        <div className={styles.draftsList}>
          <div className={styles.dropdown}>
            <button
              type="button"
              className={styles.dropdownButton}
              onClick={() => setShowDropdown(!showDropdown)}
              disabled={disabled}
            >
              <span className={styles.dropdownLabel}>
                {currentDraft ? (
                  <>
                    <span className={styles.dropdownTitle}>
                      {currentDraft.draft_title}
                    </span>
                    {currentDraft.kyc_verified && <span className={styles.kycBadge}>KYC</span>}
                    <span className={styles.dropdownDate}>
                      · {formatRelativeTime(currentDraft.updated_at)}
                    </span>
                  </>
                ) : (
                  'Select a draft...'
                )}
              </span>
              <span className={styles.dropdownArrow}>▼</span>
            </button>

            {showDropdown && (
              <div className={styles.dropdownMenu}>
                {drafts.map((draft) => (
                  <div key={draft.draft_slug} className={styles.draftItem}>
                    {editingDraftSlug === draft.draft_slug ? (
                      <input
                        className={styles.draftTitleInput}
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => handleRename(draft.draft_slug, editingTitle)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(draft.draft_slug, editingTitle);
                          if (e.key === 'Escape') setEditingDraftSlug(null);
                        }}
                        autoFocus
                        disabled={disabled}
                      />
                    ) : (
                      <>
                        <div 
                          className={`${styles.draftInfo} ${draft.draft_slug === currentDraft?.draft_slug ? styles.active : ''}`}
                          onClick={() => {
                            onLoad(draft);
                            setShowDropdown(false);
                          }}
                        >
                          <div className={styles.draftName}>
                            <span className={styles.draftTitleText}>{draft.draft_title}</span>
                            <button
                              type="button"
                              className={styles.renameButton}
                              onClick={(e) => {
                                e.stopPropagation();
                                startRename(draft.draft_slug, draft.draft_title);
                              }}
                              disabled={disabled}
                              title="Rename draft"
                            >
                              Edit
                            </button>
                            {draft.kyc_verified && <span className={styles.kycBadge}>KYC</span>}
                          </div>
                          <div className={styles.draftMeta}>
                            <span className={styles.proposalTitleSmall}>
                              Proposal: {draft.title || 'Untitled'}
                            </span>
                            <span className={styles.draftDate}>
                              {formatRelativeTime(draft.updated_at)}
                            </span>
                            <span className={styles.draftType}>
                              {draft.proposal_type === 'timelock_v1' 
                                ? 'TimelockV1' 
                                : draft.proposal_type === 'candidate'
                                  ? 'Candidate'
                                  : 'Standard'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete this draft: "${draft.draft_title}"?`)) {
                              onDelete(draft.draft_slug);
                            }
                          }}
                          disabled={disabled}
                          title="Delete draft"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {currentDraft && (
            <div className={styles.autoSaveIndicator}>
              Auto-saving as you type...
            </div>
          )}
        </div>
      )}
    </div>
  );
}

