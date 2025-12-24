/**
 * VoterDetailView
 * Full voter/delegate profile
 */

'use client';

import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useVoter } from '../hooks';
import { getSupportLabel, getSupportColor } from '../types';
import { ShareButton } from '../components/ShareButton';
import styles from './VoterDetailView.module.css';

interface VoterDetailViewProps {
  address: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function VoterDetailView({ address, onNavigate, onBack }: VoterDetailViewProps) {
  const { data: voter, isLoading, error } = useVoter(address);
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
  });

  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load voter</p>
      </div>
    );
  }

  if (isLoading || !voter) {
    return (
      <div className={styles.loading}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Loading voter...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
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
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{voter.delegatedVotes}</span>
          <span className={styles.statLabel}>Voting Power</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{voter.tokenHoldersRepresentedAmount}</span>
          <span className={styles.statLabel}>Delegators</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{voter.nounsRepresented.length}</span>
          <span className={styles.statLabel}>Nouns Held</span>
        </div>
      </div>

      {/* Nouns Represented */}
      {voter.nounsRepresented.length > 0 && (
        <div className={styles.nounsSection}>
          <h2 className={styles.sectionTitle}>Nouns</h2>
          <div className={styles.nounsList}>
            {voter.nounsRepresented.map((noun: { id: string }) => (
              <span key={noun.id} className={styles.nounId}>
                #{noun.id}
              </span>
            ))}
          </div>
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
                  <div className={styles.voteReason}>"{vote.reason}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

