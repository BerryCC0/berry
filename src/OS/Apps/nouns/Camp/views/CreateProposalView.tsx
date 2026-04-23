/**
 * CreateProposalView
 * Full proposal creation interface for Camp
 * Only available when wallet is connected
 * Supports editing existing candidates
 */

'use client';

import React from 'react';
import {
  MarkdownEditor,
  ActionTemplateEditor,
  PersonaKYC,
  CreateProposalNavBar,
  TypeDraftsSection,
  TransactionsSection,
  SubmitSection,
  UpdateCandidateModal,
} from '../components/CreateProposal';
import { BerryLoader } from '../components/BerryLoader';
import { useCreateProposalForm } from '../hooks/useCreateProposalForm';
import { Toolbar, useToolbar, ToolbarBack, ToolbarTitle, ToolbarDraftStatus } from '../components/CampToolbar';
import type { CampToolbarContext } from '../Camp';
import styles from './CreateProposalView.module.css';

interface CreateProposalViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
  editProposalId?: string;
  editCandidateProposer?: string;
  editCandidateSlug?: string;
  initialDraftSlug?: string;
  toolbar?: CampToolbarContext;
}

export function CreateProposalView({
  onNavigate,
  onBack,
  editProposalId,
  editCandidateProposer,
  editCandidateSlug,
  initialDraftSlug,
  toolbar,
}: CreateProposalViewProps) {
  const form = useCreateProposalForm({
    onNavigate,
    editProposalId,
    editCandidateProposer,
    editCandidateSlug,
    initialDraftSlug,
  });
  const { isModern } = useToolbar();
  const tb = toolbar;

  // Show wallet connection prompt if not connected
  if (!form.isConnected || !form.address) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.content}>
          <div className={styles.iconWrapper}>
            <span className={styles.icon}>Create</span>
          </div>
          <h2 className={styles.title}>Connect Wallet to Create Proposals</h2>
          <p className={styles.message}>
            You need to connect your wallet to create proposals or candidates.
          </p>
          <div className={styles.hint}>
            <span className={styles.hintText}>
              Click the wallet icon in the top menu bar to connect
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching candidate or proposal data
  if (form.isEditingCandidate && form.isLoadingCandidate) {
    return (
      <div className={styles.loading}>
        <BerryLoader />
      </div>
    );
  }

  if (form.isEditingProposal && form.isLoadingProposal) {
    return (
      <div className={styles.loading}>
        <BerryLoader />
      </div>
    );
  }

  // Show error if candidate or proposal not found
  if (form.isEditingCandidate && form.candidateError) {
    return (
      <div className={styles.error}>
        {tb && <Toolbar leading={<ToolbarBack onClick={onBack} styles={tb.styles} />} />}
        <p>Failed to load candidate</p>
        {!isModern && <button className={styles.backButton} onClick={onBack}>Go Back</button>}
      </div>
    );
  }

  if (form.isEditingProposal && form.proposalError) {
    return (
      <div className={styles.error}>
        {tb && <Toolbar leading={<ToolbarBack onClick={onBack} styles={tb.styles} />} />}
        <p>Failed to load proposal</p>
        {!isModern && <button className={styles.backButton} onClick={onBack}>Go Back</button>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {tb && (
        <Toolbar
          leading={
            <>
              <ToolbarBack onClick={onBack} label="Cancel" styles={tb.styles} />
              <ToolbarTitle styles={tb.styles}>
                {form.isEditingProposal ? 'Edit Proposal' : form.isEditingCandidate ? 'Edit Candidate' : 'Create'}
              </ToolbarTitle>
            </>
          }
          center={
            form.draftTitle ? (
              <ToolbarDraftStatus
                saveStatus={form.saveStatus}
                lastSaved={form.lastSaved}
                draftTitle={form.draftTitle}
                styles={tb.styles}
              />
            ) : undefined
          }
        />
      )}
      {!isModern && <CreateProposalNavBar
        onBack={onBack}
        title="Create"
        isEditingProposal={form.isEditingProposal}
        isEditingCandidate={form.isEditingCandidate}
        editCandidateSlug={editCandidateSlug}
        editProposalId={editProposalId}
        draftTitle={form.draftTitle}
        saveStatus={form.saveStatus}
        lastSaved={form.lastSaved}
        isEditMode={form.isEditMode}
      />}

      <div className={styles.form}>
        {/* Type & Drafts Row - hide in edit mode */}
        {!form.isEditMode && (
          <TypeDraftsSection
            proposalType={form.proposalType}
            onProposalTypeChange={(type) => form.setProposalType(type)}
            drafts={form.drafts}
            currentDraft={form.currentDraft}
            onLoadDraft={form.handleLoadDraft}
            onDeleteDraft={form.handleDeleteDraft}
            onRenameDraft={form.handleRenameDraft}
            onNewDraft={form.handleNewDraft}
            hasVotingPower={form.hasVotingPower}
            candidateCost={form.candidateCost}
            isCreating={form.isCreating}
          />
        )}

        {/* Title */}
        <div className={styles.section}>
          <label className={styles.label}>Proposal Title *</label>
          <input
            type="text"
            className={styles.input}
            value={form.title}
            onChange={(e) => form.setTitle(e.target.value)}
            placeholder="Enter a clear, descriptive title for your proposal"
            disabled={form.isCreating}
            maxLength={200}
          />
        </div>

        {/* Two Column Layout */}
        <div className={styles.twoColumnLayout}>
          {/* Left Column: Description */}
          <div className={styles.leftColumn}>
            <div className={styles.section}>
              <label className={styles.label}>Description *</label>
              <MarkdownEditor
                value={form.description}
                onChange={form.setDescription}
                disabled={form.isCreating}
                minHeight={450}
              />
            </div>
          </div>

          {/* Right Column: Transactions + KYC */}
          <div className={styles.rightColumn}>
            {/* Transactions */}
            <TransactionsSection
              actionTemplateStates={form.actionTemplateStates}
              onAddAction={form.addAction}
              onRemoveAction={form.removeAction}
              onUpdateTemplateState={form.updateTemplateState}
              isCreating={form.isCreating}
              simulationResult={form.simulation.result}
              simulationIsLoading={form.simulation.isLoading}
              simulationError={form.simulation.error}
              simulationHasActions={form.simulation.hasActions}
              simulationActions={form.simulationActions || undefined}
            />

            {/* KYC Verification - Show for proposals (not candidates) when a recipient template is selected */}
            {form.proposalType !== 'candidate' && form.hasRecipientTemplate && (
              <PersonaKYC
                onComplete={form.handleKYCComplete}
                onError={form.handleKYCError}
                disabled={form.isCreating}
                walletAddress={form.recipientAddress}
                proposalTitle={form.title}
                serverVerified={form.serverKycStatus.verified}
              />
            )}
          </div>
        </div>

        {/* Submit Section */}
        <SubmitSection
          isEditingProposal={form.isEditingProposal}
          isEditingCandidate={form.isEditingCandidate}
          proposalType={form.proposalType}
          isCreating={form.isCreating}
          hasVotingPower={form.hasVotingPower}
          isEditMode={form.isEditMode}
          onSubmit={() => {
            if (form.isEditingProposal) {
              form.handleUpdateProposal();
            } else if (form.proposalType === 'candidate' || form.isEditingCandidate) {
              form.handleSubmitCandidate();
            } else {
              form.handleSubmitProposal(form.proposalType === 'timelock_v1');
            }
          }}
          onCancel={onBack}
          errorMessage={form.errorMessage}
          proposalState={form.proposalState}
          timelockV1State={form.timelockV1State}
          candidateState={form.candidateState}
          hasRecipientTemplate={form.hasRecipientTemplate}
          kycVerified={form.kycVerified}
        />
      </div>

      {/* Update Candidate Modal */}
      <UpdateCandidateModal
        isOpen={form.showUpdateModal}
        updateReason={form.updateReason}
        onUpdateReason={form.setUpdateReason}
        onClose={form.handleCloseUpdateModal}
        onConfirm={form.handleConfirmUpdate}
        hasVotingPower={form.hasVotingPower}
        updateCandidateCost={form.updateCandidateCost}
        state={form.updateModalState}
        errorMessage={form.errorMessage}
        textareaRef={form.updateReasonInputRef}
        candidate={form.editingCandidate}
      />
    </div>
  );
}