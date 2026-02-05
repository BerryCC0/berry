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

  const truncateText = (text: string, maxLength: number) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const getDescriptionPreview = (description: string) => {
    if (!description) return null;
    // Remove markdown formatting for preview
    const plainText = description
      .replace(/[#*_`~\[\]]/g, '')
      .replace(/\n+/g, ' ')
      .trim();
    return truncateText(plainText, 80);
  };

  const getActionCount = (draft: ProposalDraft) => {
    const count = draft.actions?.length || 0;
    if (count === 0) return 'No transactions';
    if (count === 1) return '1 transaction';
    return `${count} transactions`;
  };

  const getProposalTypeLabel = (type: string) => {
    switch (type) {
      case 'timelock_v1': return 'Timelock V1';
      case 'candidate': return 'Candidate';
      default: return 'Standard';
    }
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

  // Get display title - prefer proposal title, fall back to draft title
  const getDisplayTitle = (draft: ProposalDraft) => {
    if (draft.title && draft.title.trim()) {
      return draft.title;
    }
    return draft.draft_title || 'Untitled Draft';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <label className={styles.label}>
          {drafts.length === 0 ? 'No Drafts Yet' : 'Your Drafts'}
          {drafts.length > 0 && <span className={styles.count}> ({drafts.length})</span>}
        </label>
        {currentDraft && (
          <button
            type="button"
            className={styles.newButton}
            onClick={onNew}
            disabled={disabled}
          >
            + New Draft
          </button>
        )}
      </div>

      {drafts.length === 0 ? (
        <div className={styles.noDrafts}>
          <div className={styles.noDraftsText}>
            Start typing a proposal title to create your first draft.
          </div>
          <div className={styles.noDraftsHint}>
            Drafts auto-save as you type!
          </div>
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
              <div className={styles.dropdownContent}>
                {currentDraft ? (
                  <>
                    <span className={styles.dropdownTitle}>
                      {getDisplayTitle(currentDraft)}
                    </span>
                    <span className={styles.dropdownMeta}>
                      {getProposalTypeLabel(currentDraft.proposal_type)} · {getActionCount(currentDraft)} · {formatRelativeTime(currentDraft.updated_at)}
                      {currentDraft.kyc_verified && <span className={styles.kycBadge}>KYC ✓</span>}
                    </span>
                  </>
                ) : (
                  <span className={styles.dropdownPlaceholder}>Select a draft to continue editing...</span>
                )}
              </div>
              <span className={styles.dropdownArrow}>{showDropdown ? '▲' : '▼'}</span>
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
                        placeholder="Enter draft name..."
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
                          <div className={styles.draftHeader}>
                            <span className={styles.draftTitle}>{getDisplayTitle(draft)}</span>
                            {draft.kyc_verified && <span className={styles.kycBadge}>KYC</span>}
                          </div>
                          
                          {draft.description && (
                            <div className={styles.draftPreview}>
                              {getDescriptionPreview(draft.description)}
                            </div>
                          )}
                          
                          <div className={styles.draftMeta}>
                            <span className={styles.draftType}>
                              {getProposalTypeLabel(draft.proposal_type)}
                            </span>
                            <span className={styles.draftActions}>
                              {getActionCount(draft)}
                            </span>
                            <span className={styles.draftDate}>
                              {formatRelativeTime(draft.updated_at)}
                            </span>
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
                              Rename
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete this draft?\n\n"${getDisplayTitle(draft)}"`)) {
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
              ✓ Auto-saving enabled
            </div>
          )}
        </div>
      )}
    </div>
  );
}
