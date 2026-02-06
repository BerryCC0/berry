/**
 * CreateProposalView
 * Full proposal creation interface for Camp
 * Only available when wallet is connected
 * Supports editing existing candidates
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { NOUNS_ADDRESSES, NounsDAOABI, NounsDAODataABI, BERRY_CLIENT_ID } from '@/app/lib/nouns';
import {
  DraftSelector,
  MarkdownEditor,
  ActionTemplateEditor,
  PersonaKYC,
} from '../components/CreateProposal';
import { Select } from '@/src/OS/components/Primitives/Select/Select';
import type { ActionTemplateState, ProposalDraft } from '../utils/types';
import { generateSlugFromTitle, generateUniqueSlug, generateSlug, generateSlugWithConflictCheck } from '../utils/slugGenerator';
import { parseActionsToTemplates, generateActionsFromTemplate, ACTION_TEMPLATES, type ActionTemplateType } from '../utils/actionTemplates';
import { useNounHolderStatus } from '../utils/hooks/useNounHolderStatus';
import { useCandidate } from '../hooks/useCandidates';
import { useSimulation } from '../hooks/useSimulation';
import { SimulationStatus } from '../components/SimulationStatus';
import styles from './CreateProposalView.module.css';

interface CreateProposalViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
  editProposalId?: string;
  // For editing existing candidates
  editCandidateProposer?: string;
  editCandidateSlug?: string;
  // For loading a specific draft
  initialDraftSlug?: string;
}

type ProposalState = 'idle' | 'confirming' | 'pending' | 'error' | 'success';

// Helper to flatten action templates into single actions array for submission
function flattenActionTemplates(templateStates: ActionTemplateState[]): Array<{
  target: string;
  value: string;
  signature: string;
  calldata: string;
}> {
  return templateStates.flatMap(state => state.generatedActions);
}

// Helper to format relative time
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

export function CreateProposalView({ 
  onNavigate, 
  onBack, 
  editProposalId,
  editCandidateProposer,
  editCandidateSlug,
  initialDraftSlug,
}: CreateProposalViewProps) {
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();

  // Determine if we're in edit mode
  const isEditMode = Boolean(editCandidateProposer && editCandidateSlug);
  
  // Fetch candidate data if editing
  const { 
    data: editingCandidate, 
    isLoading: isLoadingCandidate,
    error: candidateError,
  } = useCandidate(
    editCandidateProposer || '', 
    editCandidateSlug || ''
  );

  // Check if user has voting power
  const { hasVotingPower, votes } = useNounHolderStatus();

  // Read candidate creation cost from Data Proxy
  const { data: candidateCost } = useReadContract({
    address: NOUNS_ADDRESSES.data as `0x${string}`,
    abi: NounsDAODataABI,
    functionName: 'createCandidateCost',
  });
  
  // Read candidate update cost
  const { data: updateCandidateCost } = useReadContract({
    address: NOUNS_ADDRESSES.data as `0x${string}`,
    abi: NounsDAODataABI,
    functionName: 'updateCandidateCost',
  });

  // Form state
  const [draftSlug, setDraftSlug] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionTemplateStates, setActionTemplateStates] = useState<ActionTemplateState[]>([
    { templateId: '', fieldValues: {}, generatedActions: [] }
  ]);
  const [proposalType, setProposalType] = useState<'standard' | 'timelock_v1' | 'candidate'>('candidate');

  // UI state
  const [proposalState, setProposalState] = useState<ProposalState>('idle');
  const [timelockV1State, setTimelockV1State] = useState<ProposalState>('idle');
  const [candidateState, setCandidateState] = useState<ProposalState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [kycVerified, setKycVerified] = useState(false);
  const [kycInquiryId, setKycInquiryId] = useState<string | undefined>();
  const [serverKycStatus, setServerKycStatus] = useState<{
    checked: boolean;
    verified: boolean;
    status: string | null;
  }>({ checked: false, verified: false, status: null });

  // Draft management
  const [drafts, setDrafts] = useState<ProposalDraft[]>([]);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('unsaved');
  const [editDataLoaded, setEditDataLoaded] = useState(false);
  
  // Check if any selected template has a recipient field (for showing KYC)
  // and extract the recipient address if filled in
  const { hasRecipientTemplate, recipientAddress } = useMemo(() => {
    for (const templateState of actionTemplateStates) {
      // Skip templates without a selected type
      if (!templateState.templateId || templateState.templateId === 'custom') continue;
      
      // Check if this template has a recipient field
      const template = ACTION_TEMPLATES[templateState.templateId as ActionTemplateType];
      if (template) {
        const hasRecipientField = template.fields.some(field => field.name === 'recipient');
        if (hasRecipientField) {
          // Return the recipient address if filled in, otherwise empty string
          const recipient = templateState.fieldValues?.recipient || '';
          return { hasRecipientTemplate: true, recipientAddress: recipient };
        }
      }
    }
    return { hasRecipientTemplate: false, recipientAddress: '' };
  }, [actionTemplateStates]);

  // Check server-side KYC status when recipient address changes
  useEffect(() => {
    const checkServerKycStatus = async () => {
      // Only check if we have a valid recipient address (0x + 40 hex chars)
      if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        setServerKycStatus({ checked: false, verified: false, status: null });
        return;
      }

      try {
        const response = await fetch(`/api/kyc/status?wallet=${recipientAddress}`);
        const data = await response.json();
        
        if (data.success) {
          setServerKycStatus({
            checked: true,
            verified: data.verified,
            status: data.status,
          });
          // If server says verified, update local state too
          if (data.verified) {
            setKycVerified(true);
            setKycInquiryId(data.inquiryId);
          }
        } else {
          setServerKycStatus({ checked: true, verified: false, status: null });
        }
      } catch (error) {
        console.error('Failed to check KYC status:', error);
        setServerKycStatus({ checked: true, verified: false, status: null });
      }
    };

    checkServerKycStatus();
  }, [recipientAddress]);
  
  // Update modal state
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateReason, setUpdateReason] = useState('');
  const [updateModalState, setUpdateModalState] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const updateReasonInputRef = useRef<HTMLTextAreaElement>(null);

  // Simulation - memoize actions to avoid re-simulating on every render
  const simulationActions = useMemo(() => {
    const actions = flattenActionTemplates(actionTemplateStates);
    // Only simulate if we have valid actions with non-empty targets
    const validActions = actions.filter(a => a.target && a.target !== '');
    return validActions.length > 0 ? validActions : null;
  }, [actionTemplateStates]);
  
  const simulation = useSimulation(simulationActions);

  // Populate form with candidate data when editing
  useEffect(() => {
    if (isEditMode && editingCandidate && !editDataLoaded) {
      // Extract title from description (assuming # Title format)
      const descriptionText = editingCandidate.description || '';
      let extractedTitle = editingCandidate.title || '';
      let extractedDescription = descriptionText;
      
      // If description starts with # Title, extract it
      const titleMatch = descriptionText.match(/^#\s*(.+?)(?:\n|$)/);
      if (titleMatch) {
        extractedTitle = titleMatch[1].trim();
        extractedDescription = descriptionText.replace(/^#\s*.+?\n\n?/, '').trim();
      }
      
      setTitle(extractedTitle);
      setDescription(extractedDescription);
      setProposalType('candidate'); // Lock to candidate type when editing
      setDraftSlug(editCandidateSlug || '');
      
      // Parse candidate actions back to template states
      if (editingCandidate.actions && editingCandidate.actions.length > 0) {
        try {
          const parsedTemplates = parseActionsToTemplates(editingCandidate.actions);
          
          // Regenerate actions for each template to ensure consistency
          const templatesWithActions = parsedTemplates.map(template => {
            if (template.templateId !== 'custom' && template.templateId !== '') {
              try {
                const regeneratedActions = generateActionsFromTemplate(
                  template.templateId,
                  template.fieldValues
                );
                return {
                  ...template,
                  generatedActions: regeneratedActions
                };
              } catch {
                // If regeneration fails, keep the original parsed template
                return template;
              }
            }
            return template;
          });
          
          setActionTemplateStates(templatesWithActions);
        } catch (err) {
          console.error('Failed to parse candidate actions:', err);
          // Fall back to custom template with raw actions
          const fallbackTemplates: ActionTemplateState[] = editingCandidate.actions.map(action => ({
            templateId: 'custom' as const,
            fieldValues: {
              target: action.target,
              value: action.value,
              signature: action.signature,
              calldata: action.calldata
            },
            generatedActions: [action]
          }));
          setActionTemplateStates(fallbackTemplates);
        }
      }
      
      setEditDataLoaded(true);
    }
  }, [isEditMode, editingCandidate, editDataLoaded, editCandidateSlug]);

  // Load drafts on mount (skip in edit mode)
  useEffect(() => {
    if (address && !isEditMode) {
      loadUserDrafts();
    }
  }, [address, isEditMode]);

  // Auto-load draft when drafts are loaded (skip in edit mode)
  // If initialDraftSlug is provided, load that specific draft; otherwise load most recent
  useEffect(() => {
    if (drafts.length > 0 && !draftSlug && address && !isEditMode) {
      if (initialDraftSlug) {
        // Find and load the specific draft
        const targetDraft = drafts.find(d => d.draft_slug === initialDraftSlug);
        if (targetDraft) {
          handleLoadDraft(targetDraft);
        } else {
          // Fall back to most recent if not found
          handleLoadDraft(drafts[0]);
        }
      } else {
        // Load most recent draft
        handleLoadDraft(drafts[0]);
      }
    }
  }, [drafts.length, address, isEditMode, initialDraftSlug]);

  // Auto-save draft as user types (debounced)
  useEffect(() => {
    if (!address) return;
    
    // Generate draft title if empty
    if (!draftTitle && title.trim()) {
      const autoTitle = `Proposal: ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`;
      setDraftTitle(autoTitle);
    }
    
    // Check if there are any non-empty actions to save
    const hasActions = actionTemplateStates.some(
      state => state.templateId || state.generatedActions.length > 0
    );
    
    // Don't save completely empty drafts (no title AND no description AND no actions)
    if (!draftTitle && !title.trim() && !description.trim() && !hasActions) {
      setSaveStatus('unsaved');
      return;
    }

    setSaveStatus('unsaved');

    // Debounce auto-save by 5 seconds
    const timeoutId = setTimeout(async () => {
      const currentDraftTitle = draftTitle || 'Untitled Proposal';
      const currentDraftSlug = draftSlug || generateUniqueSlug(generateSlug(currentDraftTitle));
      
      const draft: ProposalDraft = {
        wallet_address: address,
        draft_slug: currentDraftSlug,
        draft_title: currentDraftTitle,
        title,
        description,
        actions: flattenActionTemplates(actionTemplateStates),
        action_templates: actionTemplateStates,
        proposal_type: proposalType,
        kyc_verified: kycVerified,
        kyc_inquiry_id: kycInquiryId,
      };

      setSaveStatus('saving');

      try {
        await fetch('/api/proposals/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        
        if (!draftSlug) {
          setDraftSlug(currentDraftSlug);
        }
        if (!draftTitle) {
          setDraftTitle(currentDraftTitle);
        }
        
        setLastSaved(new Date());
        setSaveStatus('saved');
        loadUserDrafts();
      } catch (err) {
        console.error('Auto-save failed:', err);
        setSaveStatus('error');
      }
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [draftTitle, title, description, actionTemplateStates, proposalType, kycVerified, kycInquiryId, address, draftSlug]);

  const loadUserDrafts = async () => {
    if (!address) return;
    
    try {
      const response = await fetch(`/api/proposals/drafts?wallet=${address}`);
      const data = await response.json();
      
      if (data.success && data.drafts) {
        setDrafts(data.drafts);
      }
    } catch (error) {
      console.error('Failed to load drafts:', error);
    }
  };

  const handleLoadDraft = (draft: ProposalDraft) => {
    setDraftSlug(draft.draft_slug);
    setDraftTitle(draft.draft_title);
    setTitle(draft.title);
    setDescription(draft.description);
    
    if (draft.action_templates && draft.action_templates.length > 0) {
      setActionTemplateStates(draft.action_templates);
    } else if (draft.actions && draft.actions.length > 0) {
      const customTemplates: ActionTemplateState[] = draft.actions.map(action => ({
        templateId: 'custom' as const,
        fieldValues: {},
        generatedActions: [action]
      }));
      setActionTemplateStates(customTemplates);
    } else {
      setActionTemplateStates([
        { templateId: '', fieldValues: {}, generatedActions: [] }
      ]);
    }
    
    setProposalType(draft.proposal_type);
    setKycVerified(draft.kyc_verified);
    setKycInquiryId(draft.kyc_inquiry_id);
    setErrorMessage(null);
    setLastSaved(draft.updated_at || null);
    setSaveStatus('saved');
  };

  const handleDeleteDraft = async (draftSlugToDelete: string) => {
    if (!address) return;

    try {
      await fetch(`/api/proposals/drafts?wallet=${address}&slug=${encodeURIComponent(draftSlugToDelete)}`, {
        method: 'DELETE',
      });
      
      await loadUserDrafts();
      
      if (draftSlug === draftSlugToDelete) {
        handleNewDraft();
      }
    } catch (error) {
      console.error('Error deleting draft:', error);
      setErrorMessage('Failed to delete draft');
    }
  };

  const handleRenameDraft = async (draftSlugToRename: string, newTitle: string) => {
    if (!address) return;

    try {
      await fetch('/api/proposals/drafts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          draft_slug: draftSlugToRename,
          new_title: newTitle,
        }),
      });

      if (draftSlug === draftSlugToRename) {
        setDraftTitle(newTitle);
      }
      
      await loadUserDrafts();
    } catch (error) {
      console.error('Error renaming draft:', error);
    }
  };

  const handleNewDraft = () => {
    setDraftSlug('');
    setDraftTitle('');
    setTitle('');
    setDescription('');
    setActionTemplateStates([
      { templateId: '', fieldValues: {}, generatedActions: [] }
    ]);
    setProposalType('candidate');
    setKycVerified(false);
    setKycInquiryId(undefined);
    setErrorMessage(null);
    setProposalState('idle');
    setTimelockV1State('idle');
    setCandidateState('idle');
    setLastSaved(null);
    setSaveStatus('unsaved');
  };

  const handleKYCComplete = (data: { inquiryId: string; status: string; fields: Record<string, unknown> }) => {
    setKycVerified(true);
    setKycInquiryId(data.inquiryId);
    setErrorMessage(null);
  };

  const handleKYCError = () => {
    setKycVerified(false);
    setErrorMessage('KYC verification failed. Please try again.');
  };

  const addAction = () => {
    setActionTemplateStates([
      ...actionTemplateStates, 
      { templateId: '', fieldValues: {}, generatedActions: [] }
    ]);
  };

  const removeAction = (index: number) => {
    if (actionTemplateStates.length > 1) {
      setActionTemplateStates(prev => prev.filter((_, i) => i !== index));
    }
  };

  const updateTemplateState = useCallback((index: number, newState: ActionTemplateState) => {
    setActionTemplateStates(prev => {
      const updated = [...prev];
      updated[index] = newState;
      return updated;
    });
  }, []);

  const validateForm = () => {
    if (!title.trim()) {
      setErrorMessage('Title is required');
      return false;
    }

    if (!description.trim()) {
      setErrorMessage('Description is required');
      return false;
    }

    const allActions = flattenActionTemplates(actionTemplateStates);
    for (let i = 0; i < allActions.length; i++) {
      const action = allActions[i];
      if (!action.target.trim()) {
        setErrorMessage(`Transaction ${i + 1}: Target address is required`);
        return false;
      }

      if (!/^0x[a-fA-F0-9]{40}$/.test(action.target)) {
        setErrorMessage(`Transaction ${i + 1}: Invalid target address format`);
        return false;
      }

      if (isNaN(Number(action.value))) {
        setErrorMessage(`Transaction ${i + 1}: Value must be a valid number`);
        return false;
      }
    }

    return true;
  };

  // Open update modal (for edit mode)
  const handleOpenUpdateModal = () => {
    if (!validateForm()) return;
    setShowUpdateModal(true);
    setUpdateReason('');
    setUpdateModalState('idle');
    // Focus the reason input after modal opens
    setTimeout(() => updateReasonInputRef.current?.focus(), 100);
  };
  
  // Close update modal
  const handleCloseUpdateModal = useCallback(() => {
    if (updateModalState !== 'pending') {
      setShowUpdateModal(false);
      setUpdateReason('');
      setUpdateModalState('idle');
    }
  }, [updateModalState]);
  
  // Confirm update from modal
  const handleConfirmUpdate = async () => {
    if (!editCandidateSlug) return;
    
    setUpdateModalState('pending');
    setErrorMessage(null);
    
    try {
      const allActions = flattenActionTemplates(actionTemplateStates);
      const targets = allActions.map(action => action.target as `0x${string}`);
      const values = allActions.map(action => BigInt(action.value));
      const signatures = allActions.map(action => action.signature);
      const calldatas = allActions.map(action => {
        const data = action.calldata;
        return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`;
      });
      const fullDescription = `# ${title}\n\n${description}`;
      
      const shouldPayFee = !hasVotingPower;
      const feeAmount = shouldPayFee && updateCandidateCost ? updateCandidateCost : BigInt(0);
      
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'updateProposalCandidate',
        args: [
          targets, 
          values, 
          signatures, 
          calldatas, 
          fullDescription, 
          editCandidateSlug, 
          BigInt(0), // proposalIdToUpdate
          updateReason,
        ],
        value: feeAmount,
      });
      
      setUpdateModalState('success');
      
      // Navigate back to candidate detail after success
      setTimeout(() => {
        setShowUpdateModal(false);
        onNavigate(`c/${editCandidateSlug}`);
      }, 2000);
    } catch (error) {
      console.error('Failed to update candidate:', error);
      setUpdateModalState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to update candidate');
    }
  };

  const handleSubmitCandidate = async () => {
    if (!validateForm()) return;
    if (!address) return; // Need wallet connected
    
    // In edit mode, open the update modal instead of directly submitting
    if (isEditMode && editCandidateSlug) {
      handleOpenUpdateModal();
      return;
    }

    setErrorMessage(null);
    setCandidateState('confirming');

    try {
      const allActions = flattenActionTemplates(actionTemplateStates);
      const targets = allActions.map(action => action.target as `0x${string}`);
      const values = allActions.map(action => BigInt(action.value));
      const signatures = allActions.map(action => action.signature);
      const calldatas = allActions.map(action => {
        const data = action.calldata;
        return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`;
      });
      const fullDescription = `# ${title}\n\n${description}`;

      setCandidateState('pending');
      
      // CREATE new candidate - only add unique suffix if slug already exists
      const uniqueSlug = await generateSlugWithConflictCheck(title, address);
      
      const shouldPayFee = !hasVotingPower;
      const feeAmount = shouldPayFee && candidateCost ? candidateCost : BigInt(0);
      
      await writeContractAsync({
        address: NOUNS_ADDRESSES.data as `0x${string}`,
        abi: NounsDAODataABI,
        functionName: 'createProposalCandidate',
        args: [targets, values, signatures, calldatas, fullDescription, uniqueSlug, BigInt(0)],
        value: feeAmount,
      });

      setCandidateState('success');
      setErrorMessage(null);

      setTimeout(() => {
        handleNewDraft();
      }, 3000);
    } catch (err: unknown) {
      setCandidateState('error');

      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setErrorMessage('Transaction was rejected');
        } else if (err.message.includes('insufficient funds')) {
          setErrorMessage('Insufficient funds for transaction');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage(isEditMode ? 'Failed to update candidate' : 'Failed to create candidate');
      }
    }
  };

  const handleSubmitProposal = async (isTimelockV1: boolean = false) => {
    if (!validateForm()) return;

    setErrorMessage(null);
    const setState = isTimelockV1 ? setTimelockV1State : setProposalState;
    setState('confirming');

    try {
      const allActions = flattenActionTemplates(actionTemplateStates);
      const targets = allActions.map(action => action.target as `0x${string}`);
      const values = allActions.map(action => BigInt(action.value));
      const signatures = allActions.map(action => action.signature);
      const calldatas = allActions.map(action => {
        const data = action.calldata;
        return (data.startsWith('0x') ? data : `0x${data}`) as `0x${string}`;
      });
      const fullDescription = `# ${title}\n\n${description}`;

      setState('pending');
      
      // Use proposeOnTimelockV1 for TimelockV1 proposals, standard propose otherwise
      // Both include BERRY_CLIENT_ID (11) for client rewards
      await writeContractAsync({
        address: NOUNS_ADDRESSES.governor as `0x${string}`,
        abi: NounsDAOABI,
        functionName: isTimelockV1 ? 'proposeOnTimelockV1' : 'propose',
        args: [targets, values, signatures, calldatas, fullDescription, BERRY_CLIENT_ID],
      });

      setState('success');
      setErrorMessage(null);

      setTimeout(() => {
        handleNewDraft();
      }, 3000);
    } catch (err: unknown) {
      setState('error');

      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          setErrorMessage('Transaction was rejected');
        } else if (err.message.includes('insufficient funds')) {
          setErrorMessage('Insufficient funds for transaction');
        } else {
          setErrorMessage(err.message);
        }
      } else {
        setErrorMessage('Failed to create proposal. Please try again.');
      }
    }
  };

  const isCreating = isPending || proposalState === 'pending' || timelockV1State === 'pending' || candidateState === 'pending';

  // Show wallet connection prompt if not connected
  if (!isConnected || !address) {
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

  // Show loading state while fetching candidate data
  if (isEditMode && isLoadingCandidate) {
    return (
      <div className={styles.loading}>
        <p>Loading candidate data...</p>
      </div>
    );
  }

  // Show error if candidate not found
  if (isEditMode && candidateError) {
    return (
      <div className={styles.error}>
        <p>Failed to load candidate</p>
        <button className={styles.backButton} onClick={onBack}>Go Back</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Nav bar with back button and title */}
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>
          ← Back
        </button>
        <h2 className={styles.pageTitle}>
          {isEditMode ? 'Edit Candidate' : 'Create'}
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
        {isEditMode && editCandidateSlug && (
          <div className={styles.editIndicator}>
            <span className={styles.editSlug}>/{editCandidateSlug}</span>
          </div>
        )}
      </div>

      <div className={styles.form}>
        {/* Type & Drafts Row - hide in edit mode */}
        {!isEditMode && (
          <div className={styles.typeDraftsRow}>
            {/* Proposal Type - Left */}
            <div className={styles.typeColumn}>
              <label className={styles.label}>Proposal Type *</label>
              <Select
                options={[
                  { 
                    value: 'candidate', 
                    label: 'Candidate',
                    description: 'Gather community support before formal submission'
                  },
                  { 
                    value: 'standard', 
                    label: 'Standard Proposal',
                    description: 'Submit directly to onchain voting (requires 4 Nouns)'
                  },
                  { 
                    value: 'timelock_v1', 
                    label: 'Timelock V1 Proposal',
                    description: 'For legacy proposals using Timelock V1'
                  },
                ]}
                value={proposalType}
                onChange={(value) => setProposalType(value as 'candidate' | 'standard' | 'timelock_v1')}
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
                currentDraft={drafts.find(d => d.draft_slug === draftSlug) || null}
                onLoad={handleLoadDraft}
                onDelete={handleDeleteDraft}
                onRename={handleRenameDraft}
                onNew={handleNewDraft}
                disabled={isCreating}
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div className={styles.section}>
          <label className={styles.label}>Proposal Title *</label>
          <input
            type="text"
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a clear, descriptive title for your proposal"
            disabled={isCreating}
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
                value={description}
                onChange={setDescription}
                disabled={isCreating}
                minHeight={450}
              />
            </div>
          </div>

          {/* Right Column: Transactions + KYC */}
          <div className={styles.rightColumn}>
            {/* Transactions */}
            <div className={styles.section}>
              <label className={styles.label}>Transactions</label>

              {actionTemplateStates.map((templateState, index) => (
                <div key={index} className={styles.actionContainer}>
                  {actionTemplateStates.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeActionButton}
                      onClick={() => removeAction(index)}
                      disabled={isCreating}
                      title="Remove this action"
                    >
                      ×
                    </button>
                  )}
                  
                  <ActionTemplateEditor
                    index={index}
                    templateState={templateState}
                    onUpdateTemplateState={(newState) => updateTemplateState(index, newState)}
                    disabled={isCreating}
                  />
                </div>
              ))}

              <div className={styles.addButtonRow}>
                <button
                  type="button"
                  className={styles.addButton}
                  onClick={addAction}
                  disabled={isCreating}
                >
                  + New Transaction
                </button>
              </div>
              
              {/* Simulation Status */}
              <SimulationStatus
                result={simulation.result}
                isLoading={simulation.isLoading}
                error={simulation.error}
                hasActions={simulation.hasActions}
                actions={simulationActions || undefined}
              />
            </div>

            {/* KYC Verification - Show for proposals (not candidates) when a recipient template is selected */}
            {proposalType !== 'candidate' && hasRecipientTemplate && (
              <PersonaKYC
                onComplete={handleKYCComplete}
                onError={handleKYCError}
                disabled={isCreating}
                walletAddress={recipientAddress}
                proposalTitle={title}
                serverVerified={serverKycStatus.verified}
              />
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className={styles.submitSection}>
          <button
            className={styles.submitButton}
            onClick={() => {
              if (proposalType === 'candidate' || isEditMode) {
                handleSubmitCandidate();
              } else {
                handleSubmitProposal(proposalType === 'timelock_v1');
              }
            }}
            disabled={isCreating || (!isEditMode && proposalType !== 'candidate' && !hasVotingPower)}
          >
            {isCreating 
              ? (isEditMode ? 'Updating...' : 'Creating...')
              : isEditMode
                ? 'Update Candidate'
                : proposalType === 'candidate'
                  ? 'Create Candidate'
                  : proposalType === 'timelock_v1' 
                    ? 'Propose on TimelockV1' 
                    : 'Create Proposal'}
          </button>
          {isEditMode && (
            <button
              className={styles.cancelButton}
              onClick={onBack}
              disabled={isCreating}
            >
              Cancel
            </button>
          )}
        </div>

        {/* KYC Warning for proposals (not candidates) with recipient templates */}
        {proposalType !== 'candidate' && hasRecipientTemplate && !kycVerified && (
          <div className={styles.warning}>
            <strong>KYC Not Completed:</strong> You can still submit this proposal, but if it succeeds and you haven&apos;t completed KYC, it may not be executed.
          </div>
        )}

        {/* Error/Success Messages */}
        {errorMessage && (
          <div className={errorMessage.includes('successfully') ? styles.success : styles.error}>
            {errorMessage}
          </div>
        )}

        {proposalState === 'success' && (
          <div className={styles.success}>
            Your proposal has been successfully created! It will appear in the proposals list once confirmed on-chain.
          </div>
        )}

        {timelockV1State === 'success' && (
          <div className={styles.success}>
            Your TimelockV1 proposal has been successfully created! It will appear in the proposals list once confirmed on-chain.
          </div>
        )}

        {candidateState === 'success' && (
          <div className={styles.success}>
            Your candidate has been successfully created! Share it with the community to gather support.
          </div>
        )}
      </div>
      
      {/* Update Candidate Modal */}
      {showUpdateModal && (
        <div className={styles.modalOverlay} onClick={handleCloseUpdateModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Update Candidate</h3>
            
            {updateModalState === 'success' ? (
              <div className={styles.modalSuccess}>
                Your candidate has been successfully updated! Redirecting...
              </div>
            ) : (
              <>
                <p className={styles.modalDescription}>
                  Provide an optional reason for this update. This will be recorded on-chain.
                </p>
                
                <textarea
                  ref={updateReasonInputRef}
                  className={styles.modalTextarea}
                  value={updateReason}
                  onChange={(e) => setUpdateReason(e.target.value)}
                  placeholder="Briefly describe what changed (optional)"
                  disabled={updateModalState === 'pending'}
                  rows={3}
                />
                
                {!hasVotingPower && updateCandidateCost && (
                  <div className={styles.modalFeeNotice}>
                    Update fee: {(Number(updateCandidateCost) / 1e18).toFixed(4)} ETH
                    <span className={styles.modalFeeNote}>(waived for Noun owners)</span>
                  </div>
                )}
                
                {updateModalState === 'error' && errorMessage && (
                  <div className={styles.modalError}>{errorMessage}</div>
                )}
                
                <div className={styles.modalActions}>
                  <button
                    className={styles.modalButtonSecondary}
                    onClick={handleCloseUpdateModal}
                    disabled={updateModalState === 'pending'}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.modalButtonPrimary}
                    onClick={handleConfirmUpdate}
                    disabled={updateModalState === 'pending'}
                  >
                    {updateModalState === 'pending' ? 'Updating...' : 'Update Candidate'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}