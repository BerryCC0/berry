/**
 * VoterDetailView
 * Full voter/delegate profile
 */

'use client';

import { useState } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { NounImage } from '@/app/lib/nouns/components';
import { useVoter } from '../hooks';
import { getSupportLabel, getSupportColor } from '../types';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { DelegateModal } from '../components/DelegateModal';
import styles from './VoterDetailView.module.css';

interface VoterDetailViewProps {
  address: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  showBackButton?: boolean;
  isOwnAccount?: boolean; // True when viewing your own account
}

// Component to display an address with ENS resolution
function AddressLink({ 
  address, 
  onClick 
}: { 
  address: string; 
  onClick?: () => void;
}) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <span 
      className={styles.addressLink} 
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {displayName}
    </span>
  );
}

export function VoterDetailView({ address, onNavigate, onBack, showBackButton = true, isOwnAccount = false }: VoterDetailViewProps) {
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const { data: voter, isLoading, error } = useVoter(address);
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
  });

  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  // Get owned Nouns
  const nounsOwned = voter?.nounsOwned || [];
  
  // Get delegation info
  const delegatingTo = voter?.delegatingTo;
  const delegators = voter?.delegators || [];
  const isSelfDelegated = delegatingTo?.toLowerCase() === address.toLowerCase();
  
  // Show delegate button if viewing own account and they OWN Nouns
  const canDelegate = isOwnAccount && nounsOwned.length > 0;

  if (error) {
    return (
      <div className={styles.error}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <p>Failed to load voter</p>
      </div>
    );
  }

  if (isLoading || !voter) {
    return (
      <div className={styles.loading}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <p>Loading voter...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <ShareButton path={`voter/${address}`} />
      </div>

      <div className={styles.profile}>
        {ensAvatar ? (
          <img src={ensAvatar} alt="" className={styles.avatar} />
        ) : (
          <div className={styles.avatarPlaceholder} />
        )}
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{displayName}</h1>
          <span className={styles.address}>{address}</span>
        </div>
        {canDelegate && (
          <button 
            className={styles.delegateButton}
            onClick={() => setShowDelegateModal(true)}
          >
            Delegate
          </button>
        )}
      </div>
      
      {showDelegateModal && (
        <DelegateModal
          userAddress={address as `0x${string}`}
          onClose={() => setShowDelegateModal(false)}
        />
      )}

      {/* Voting Power */}
      <div className={styles.votingPower}>
        <span className={styles.votingPowerValue}>{voter.delegatedVotes}</span>
        <span className={styles.votingPowerLabel}>Voting Power</span>
      </div>

      {/* Nouns Owned */}
      {nounsOwned.length > 0 && (
        <div className={styles.nounsSection}>
          <h2 className={styles.sectionTitle}>Nouns Owned</h2>
          <div className={styles.nounsGrid}>
            {nounsOwned.map((noun) => (
              <div key={noun.id} className={styles.nounCard}>
                {noun.seed ? (
                  <NounImage seed={noun.seed} size={64} className={styles.nounImage} />
                ) : (
                  <div className={styles.nounImagePlaceholder} />
                )}
                <span className={styles.nounId}>#{noun.id}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delegation Info */}
      {(delegatingTo || delegators.length > 0) && (
        <div className={styles.delegationSection}>
          {/* Who this account is delegating to */}
          {delegatingTo && !isSelfDelegated && (
            <div className={styles.delegationRow}>
              <span className={styles.delegationLabel}>Delegating to</span>
              <AddressLink 
                address={delegatingTo} 
                onClick={() => onNavigate(`voter/${delegatingTo}`)}
              />
            </div>
          )}
          
          {isSelfDelegated && (
            <div className={styles.delegationRow}>
              <span className={styles.delegationLabel}>Delegating to</span>
              <span className={styles.selfDelegated}>Self</span>
            </div>
          )}

          {/* Who is delegating to this account */}
          {delegators.length > 0 && (
            <div className={styles.delegationRow}>
              <span className={styles.delegationLabel}>
                Delegators ({delegators.length})
              </span>
              <div className={styles.delegatorsList}>
                {delegators.slice(0, 5).map((delegator) => (
                  <AddressLink 
                    key={delegator}
                    address={delegator} 
                    onClick={() => onNavigate(`voter/${delegator}`)}
                  />
                ))}
                {delegators.length > 5 && (
                  <span className={styles.moreCount}>+{delegators.length - 5} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Votes */}
      {voter.recentVotes && voter.recentVotes.length > 0 && (
        <div className={styles.votesSection}>
          <h2 className={styles.sectionTitle}>Recent Votes</h2>
          <div className={styles.votesList}>
            {voter.recentVotes.map((vote: any) => (
              <div 
                key={vote.id} 
                className={styles.voteItem}
                onClick={() => onNavigate(`proposal/${vote.proposalId}`)}
              >
                <div className={styles.voteHeader}>
                  <span className={styles.proposalId}>Prop #{vote.proposalId}</span>
                  <span 
                    className={styles.voteSupport}
                    style={{ color: getSupportColor(vote.support) }}
                  >
                    {getSupportLabel(vote.support)}
                  </span>
                </div>
                {vote.proposalTitle && (
                  <div className={styles.proposalTitle}>{vote.proposalTitle}</div>
                )}
                {vote.reason && (
                  <MarkdownRenderer 
                    content={vote.reason} 
                    className={styles.voteReason}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
