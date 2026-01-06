/**
 * SponsorsPanel Component
 * Shows candidate sponsors with their voting power
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useEnsName, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import type { CandidateSignature } from '../types';
import styles from './SponsorsPanel.module.css';

interface SponsorsPanelProps {
  signatures: CandidateSignature[];
  proposer: string;
  threshold: number; // This is proposalThreshold from Goldsky - actual requirement is > threshold
  onNavigate: (path: string) => void;
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

export function SponsorsPanel({ signatures, proposer, threshold, onNavigate }: SponsorsPanelProps) {
  // Track voting power for each unique signer
  const [sponsorVotes, setSponsorVotes] = useState<Record<string, number>>({});
  
  // Get voting power for proposer
  const { data: proposerVotingPower } = useReadContract({
    address: NOUNS_CONTRACTS.token.address,
    abi: NOUNS_CONTRACTS.token.abi,
    functionName: 'getCurrentVotes',
    args: [proposer as `0x${string}`],
  });

  const proposerVotes = proposerVotingPower ? Number(proposerVotingPower) : 0;

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
    </div>
  );
}
