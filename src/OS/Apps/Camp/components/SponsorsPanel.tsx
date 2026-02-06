/**
 * SponsorsPanel Component
 * Shows candidate sponsors with their voting power
 * Includes ability to sponsor candidates
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useEnsName, useReadContract, useAccount, usePublicClient } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import { useSponsorCandidate } from '../hooks/useSponsorCandidate';
import type { CandidateSignature, Candidate } from '../types';
import styles from './SponsorsPanel.module.css';

interface SponsorsPanelProps {
  signatures: CandidateSignature[];
  proposer: string;
  threshold: number; // This is proposalThreshold from Goldsky - actual requirement is > threshold
  onNavigate: (path: string) => void;
  onSponsorVotesChange?: (totalSponsorVotes: number) => void;
  // Candidate data needed for sponsoring
  candidate?: Candidate;
  // Callback when sponsorship is successful
  onSponsorSuccess?: () => void;
}

interface SponsorItemProps {
  signature: CandidateSignature;
  onNavigate: (path: string) => void;
  onVotesLoaded: (signer: string, votes: number) => void;
}

function SponsorItem({ signature, onNavigate, onVotesLoaded }: SponsorItemProps) {
  const { data: ensName } = useEnsName({
    address: signature.signer as `0x${string}`,
    chainId: mainnet.id,
  });

  // Get voting power for this signer
  const { data: votingPower } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'getCurrentVotes',
    args: [signature.signer as `0x${string}`],
  });

  const votes = votingPower ? Number(votingPower) : 0;

  // Report votes to parent when loaded
  useEffect(() => {
    onVotesLoaded(signature.signer.toLowerCase(), votes);
  }, [signature.signer, votes, onVotesLoaded]);

  const displayName = ensName || `${signature.signer.slice(0, 6)}...${signature.signer.slice(-4)}`;
  
  // Calculate days until expiration
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = Number(signature.expirationTimestamp) - now;
  const daysUntilExpiry = Math.ceil(expiresIn / (24 * 60 * 60));
  
  // Format date
  const signedDate = new Date(Number(signature.createdTimestamp) * 1000);
  const dateStr = signedDate.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });

  return (
    <div className={styles.sponsorItem}>
      <div className={styles.sponsorHeader}>
        <span 
          className={styles.sponsorName}
          onClick={() => onNavigate(`voter/${signature.signer}`)}
        >
          {displayName}
        </span>
        <span className={styles.sponsorVotes}>
          ({votes} {votes === 1 ? 'noun' : 'nouns'})
        </span>
        <span className={styles.sponsorDate}>{dateStr}</span>
      </div>
      {signature.reason && (
        <div className={styles.sponsorReason}>{signature.reason}</div>
      )}
      <div className={styles.sponsorExpiry}>
        {daysUntilExpiry > 0 
          ? `Expires in ${daysUntilExpiry} day${daysUntilExpiry !== 1 ? 's' : ''}`
          : 'Expired'}
      </div>
    </div>
  );
}

export function SponsorsPanel({ 
  signatures, 
  proposer, 
  threshold, 
  onNavigate, 
  onSponsorVotesChange,
  candidate,
  onSponsorSuccess,
}: SponsorsPanelProps) {
  const { isConnected, address } = useAccount();
  const publicClient = usePublicClient();
  
  // Track voting power for each unique signer
  const [sponsorVotes, setSponsorVotes] = useState<Record<string, number>>({});
  
  // Check if connected wallet is a Smart Contract Wallet (SCW)
  const [isSmartContractWallet, setIsSmartContractWallet] = useState(false);
  
  useEffect(() => {
    async function checkIfSCW() {
      if (!address || !publicClient) {
        setIsSmartContractWallet(false);
        return;
      }
      try {
        const code = await publicClient.getCode({ address: address as `0x${string}` });
        // If there's bytecode, it's a contract (SCW)
        setIsSmartContractWallet(code !== undefined && code !== '0x');
      } catch {
        setIsSmartContractWallet(false);
      }
    }
    checkIfSCW();
  }, [address, publicClient]);
  
  // Modal state
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorReason, setSponsorReason] = useState('');
  const [expirationDate, setExpirationDate] = useState<string>(() => {
    // Default to 14 days from now
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  });
  const reasonInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Calculate days until expiration
  const expirationDays = useMemo(() => {
    const expDate = new Date(expirationDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    expDate.setHours(0, 0, 0, 0);
    const diffTime = expDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // Minimum 1 day
  }, [expirationDate]);
  
  // Minimum date is tomorrow
  const minDate = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  }, []);
  
  // Sponsor hook
  const {
    hasVotingPower,
    isSigning,
    isPending,
    isConfirming,
    isSuccess: sponsorSuccess,
    error: sponsorError,
    signedData,
    hasPendingSignature,
    sponsorCandidate,
    signOnly,
    submitSignature,
    reset: resetSponsor,
  } = useSponsorCandidate();
  
  // Get voting power for proposer
  const { data: proposerVotingPower } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'getCurrentVotes',
    args: proposer ? [proposer as `0x${string}`] : undefined,
    query: {
      enabled: !!proposer,
    },
  });

  const proposerVotes = proposerVotingPower ? Number(proposerVotingPower) : 0;
  
  // Check if user has already sponsored
  const hasAlreadySponsored = useMemo(() => {
    if (!address) return false;
    return signatures.some(s => s.signer.toLowerCase() === address.toLowerCase());
  }, [signatures, address]);
  
  // Check if user is the proposer
  const isProposer = useMemo(() => {
    if (!address) return false;
    return proposer.toLowerCase() === address.toLowerCase();
  }, [proposer, address]);
  
  // Can sponsor: connected, has voting power, hasn't already sponsored, isn't the proposer
  const canSponsor = isConnected && hasVotingPower && !hasAlreadySponsored && !isProposer && candidate && !candidate.canceled;
  
  // Handle sponsor button click
  const handleSponsorClick = useCallback(() => {
    setShowSponsorModal(true);
    setSponsorReason('');
    // Reset expiration to 14 days from now
    const date = new Date();
    date.setDate(date.getDate() + 14);
    setExpirationDate(date.toISOString().split('T')[0]);
    resetSponsor();
    // Focus the reason input after modal opens
    setTimeout(() => reasonInputRef.current?.focus(), 100);
  }, [resetSponsor]);
  
  // Track if a sponsor operation is in progress (to prevent double calls)
  const sponsorInProgressRef = useRef(false);
  
  // Handle sponsor submit (combined flow for EOA wallets)
  const handleSponsorSubmit = useCallback(async () => {
    if (!candidate) return;
    
    // Prevent double-calls
    if (sponsorInProgressRef.current) return;
    sponsorInProgressRef.current = true;
    
    try {
      await sponsorCandidate(
        {
          proposer: candidate.proposer,
          slug: candidate.slug,
          proposalIdToUpdate: candidate.proposalIdToUpdate,
          description: candidate.description,
          actions: candidate.actions || [],
        },
        sponsorReason,
        expirationDays
      );
    } catch (err) {
      console.error('Sponsor failed:', err);
    } finally {
      sponsorInProgressRef.current = false;
    }
  }, [candidate, sponsorCandidate, sponsorReason, expirationDays]);
  
  // Handle sign only (step 1 for SCW wallets)
  const handleSignOnly = useCallback(async () => {
    if (!candidate) return;
    
    if (sponsorInProgressRef.current) return;
    sponsorInProgressRef.current = true;
    
    try {
      await signOnly(
        {
          proposer: candidate.proposer,
          slug: candidate.slug,
          proposalIdToUpdate: candidate.proposalIdToUpdate,
          description: candidate.description,
          actions: candidate.actions || [],
        },
        sponsorReason,
        expirationDays
      );
    } catch (err) {
      console.error('Sign failed:', err);
    } finally {
      sponsorInProgressRef.current = false;
    }
  }, [candidate, signOnly, sponsorReason, expirationDays]);
  
  // Handle submit signature (step 2 for SCW wallets)
  const handleSubmitSignature = useCallback(async () => {
    if (sponsorInProgressRef.current) return;
    sponsorInProgressRef.current = true;
    
    try {
      await submitSignature();
    } catch (err) {
      console.error('Submit failed:', err);
    } finally {
      sponsorInProgressRef.current = false;
    }
  }, [submitSignature]);
  
  // Handle successful sponsorship
  useEffect(() => {
    if (sponsorSuccess) {
      // Close modal after a delay to show success
      setTimeout(() => {
        setShowSponsorModal(false);
        setSponsorReason('');
        onSponsorSuccess?.();
      }, 2000);
    }
  }, [sponsorSuccess, onSponsorSuccess]);
  
  // Close modal handler
  const handleCloseModal = useCallback(() => {
    if (!isSigning && !isPending && !isConfirming) {
      setShowSponsorModal(false);
      setSponsorReason('');
      resetSponsor();
    }
  }, [isSigning, isPending, isConfirming, resetSponsor]);

  // Callback for SponsorItems to report their votes
  const handleVotesLoaded = useCallback((signer: string, votes: number) => {
    setSponsorVotes(prev => {
      if (prev[signer] === votes) return prev;
      return { ...prev, [signer]: votes };
    });
  }, []);

  // Get unique signers
  const uniqueSigners = useMemo(() => {
    const signers = new Set(signatures.map(s => s.signer.toLowerCase()));
    return Array.from(signers);
  }, [signatures]);

  // Calculate total sponsoring nouns (from sponsors only)
  const sponsorNouns = useMemo(() => {
    return uniqueSigners.reduce((sum, signer) => sum + (sponsorVotes[signer] || 0), 0);
  }, [uniqueSigners, sponsorVotes]);

  // Report sponsor votes to parent when it changes
  useEffect(() => {
    onSponsorVotesChange?.(sponsorNouns);
  }, [sponsorNouns, onSponsorVotesChange]);

  // Total nouns available = proposer's nouns + sponsor nouns
  const totalNouns = proposerVotes + sponsorNouns;

  // The actual requirement is > threshold, so we need threshold + 1 nouns
  const requiredNouns = threshold + 1;
  const hasEnoughNouns = totalNouns >= requiredNouns;

  return (
    <div className={styles.container}>
      <h2 className={styles.sectionTitle}>Sponsors</h2>
      
      {/* Summary stats */}
      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{sponsorNouns}</span>
          <span className={styles.summaryLabel}>
            sponsoring {sponsorNouns === 1 ? 'noun' : 'nouns'} across {uniqueSigners.length} {uniqueSigners.length === 1 ? 'voter' : 'voters'}
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryValue}>{proposerVotes}</span>
          <span className={styles.summaryLabel}>
            {proposerVotes === 1 ? 'noun' : 'nouns'} controlled by proposer
          </span>
        </div>
      </div>

      {/* Threshold status */}
      {hasEnoughNouns && (
        <div className={styles.thresholdMet}>
          This candidate has met the sponsor threshold ({totalNouns}/{requiredNouns}).
          Voters can continue to add signatures until the candidate is promoted.
        </div>
      )}
      {!hasEnoughNouns && requiredNouns > 0 && (
        <div className={styles.thresholdNotMet}>
          {totalNouns} of {requiredNouns} nouns needed to promote this candidate.
        </div>
      )}

      {/* Sponsors list */}
      {signatures.length > 0 ? (
        <div className={styles.sponsorsList}>
          {signatures.map(sig => (
            <SponsorItem 
              key={sig.id} 
              signature={sig} 
              onNavigate={onNavigate}
              onVotesLoaded={handleVotesLoaded}
            />
          ))}
        </div>
      ) : (
        <div className={styles.noSponsors}>
          No sponsors yet. {proposerVotes >= requiredNouns 
            ? 'The proposer has enough nouns to promote this candidate directly.'
            : `${requiredNouns - proposerVotes} more sponsoring ${requiredNouns - proposerVotes === 1 ? 'noun is' : 'nouns are'} needed to promote.`}
        </div>
      )}
      
      {/* Sponsor Button */}
      {candidate && !candidate.canceled && (
        <div className={styles.sponsorButtonContainer}>
          <button
            className={styles.sponsorButton}
            onClick={handleSponsorClick}
            disabled={!canSponsor}
            title={
              !isConnected ? 'Connect wallet to sponsor' :
              !hasVotingPower ? 'You need voting power to sponsor' :
              hasAlreadySponsored ? 'You have already sponsored this candidate' :
              isProposer ? 'You are the proposer' :
              'Sponsor this candidate'
            }
          >
            Sponsor Candidate
          </button>
          {!isConnected && (
            <span className={styles.sponsorHint}>Connect wallet to sponsor</span>
          )}
          {isConnected && !hasVotingPower && (
            <span className={styles.sponsorHint}>Requires Noun voting power</span>
          )}
          {hasAlreadySponsored && (
            <span className={styles.sponsorHint}>You have already sponsored</span>
          )}
        </div>
      )}
      
      {/* Sponsor Modal */}
      {showSponsorModal && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Sponsor Candidate</h3>
            
            {sponsorSuccess ? (
              <div className={styles.successMessage}>
                Sponsorship submitted successfully! Your signature has been added to this candidate.
              </div>
            ) : (
              <>
                <p className={styles.modalDescription}>
                  By sponsoring, you&apos;re adding your voting power to help this candidate reach the threshold 
                  for promotion to a full proposal.
                </p>
                
                {isSmartContractWallet && !hasPendingSignature && (
                  <div className={styles.scwWarning}>
                    <strong>⚠️ Smart Contract Wallet - Important</strong>
                    <p>
                      <strong>The signer must have voting power.</strong> When you sign, the signature 
                      is created by your Safe owner EOA, not the Safe itself. The Nouns contract 
                      checks if the <em>signer</em> (your owner EOA) has voting power.
                    </p>
                    <p>
                      <strong>Solution:</strong> From your Safe, delegate voting power to your owner 
                      EOA by calling <code>NounsToken.delegate(ownerAddress)</code>. Then the owner 
                      will have voting power and can sign sponsorships.
                    </p>
                  </div>
                )}
                
                {hasPendingSignature && (
                  <div className={styles.pendingSignature}>
                    <strong>✓ Signature Ready</strong>
                    <p>
                      Your signature has been created. Click &quot;Submit Transaction&quot; below to add your 
                      sponsorship to the blockchain.
                    </p>
                  </div>
                )}
                
                <div className={styles.expirationField}>
                  <label className={styles.fieldLabel}>Signature Expiration</label>
                  <div className={styles.expirationRow}>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={expirationDate}
                      onChange={e => setExpirationDate(e.target.value)}
                      min={minDate}
                      disabled={isSigning || isPending || isConfirming}
                    />
                    <span className={styles.expirationHint}>
                      {expirationDays} day{expirationDays !== 1 ? 's' : ''} from now
                    </span>
                  </div>
                  <p className={styles.fieldHelpText}>
                    Your sponsorship will be valid until this date. You can set it as far in the future as you want.
                  </p>
                </div>
                
                <div className={styles.reasonField}>
                  <label className={styles.fieldLabel}>Reason (optional)</label>
                  <textarea
                    ref={reasonInputRef}
                    className={styles.reasonInput}
                    value={sponsorReason}
                    onChange={e => setSponsorReason(e.target.value)}
                    placeholder="Why are you sponsoring this candidate?"
                    rows={3}
                    disabled={isSigning || isPending || isConfirming}
                  />
                </div>
                
                {sponsorError && (
                  <div className={styles.errorMessage}>
                    {sponsorError.message.includes('user rejected') || sponsorError.message.includes('User rejected')
                      ? 'Transaction was rejected'
                      : sponsorError.message.includes('GS013')
                      ? 'Safe transaction failed: Not enough signatures. If this is a multi-sig Safe, ensure all required signers have approved.'
                      : sponsorError.message.includes('GS')
                      ? `Safe error: ${sponsorError.message}. Try initiating the transaction from the Safe app directly.`
                      : sponsorError.message.includes('must have votes') || sponsorError.message.includes('MustHaveVotes') || sponsorError.message.includes('execution reverted')
                      ? 'The signer does not have voting power. For Safe wallets, delegate voting power from your Safe to your owner EOA, then try again.'
                      : sponsorError.message}
                  </div>
                )}
                
                <div className={styles.modalButtons}>
                  <button
                    className={styles.cancelButton}
                    onClick={handleCloseModal}
                    disabled={isSigning || isPending || isConfirming}
                  >
                    Cancel
                  </button>
                  
                  {/* For SCW wallets: two-step flow */}
                  {isSmartContractWallet ? (
                    <>
                      {!hasPendingSignature ? (
                        <button
                          className={styles.confirmButton}
                          onClick={handleSignOnly}
                          disabled={isSigning || isPending || isConfirming}
                        >
                          {isSigning ? 'Signing...' : 'Step 1: Sign Message'}
                        </button>
                      ) : (
                        <button
                          className={styles.confirmButton}
                          onClick={handleSubmitSignature}
                          disabled={isSigning || isPending || isConfirming}
                        >
                          {isPending ? 'Submitting...' :
                           isConfirming ? 'Confirming...' :
                           'Step 2: Submit Transaction'}
                        </button>
                      )}
                    </>
                  ) : (
                    /* For EOA wallets: combined flow */
                    <button
                      className={styles.confirmButton}
                      onClick={handleSponsorSubmit}
                      disabled={isSigning || isPending || isConfirming}
                    >
                      {isSigning ? 'Sign in wallet...' :
                       isPending ? 'Confirm in wallet...' :
                       isConfirming ? 'Confirming...' :
                       'Sign & Submit'}
                    </button>
                  )}
                </div>
                
                {(isSigning || isPending || isConfirming) && (
                  <div className={styles.statusHint}>
                    {isSigning && (isSmartContractWallet 
                      ? 'Please sign the message in your wallet. For multi-sig wallets, additional approvals may be needed.'
                      : 'Step 1/2: Please sign the message in your wallet...')}
                    {isPending && (isSmartContractWallet
                      ? 'Please confirm the transaction in your wallet.'
                      : 'Step 2/2: Please confirm the transaction in your wallet...')}
                    {isConfirming && 'Waiting for transaction confirmation...'}
                  </div>
                )}
                
                {!isSigning && !isPending && !isConfirming && !hasPendingSignature && (
                  <p className={styles.processHint}>
                    {isSmartContractWallet 
                      ? 'This process has two steps to support multi-sig wallets.'
                      : 'This will require a signature request followed by a transaction.'}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
