/**
 * ProposalDetailView
 * Full proposal detail with voting
 */

'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useProposal } from '../hooks';
import { useVote } from '@/app/lib/nouns/hooks';
import { getSupportLabel, getSupportColor } from '../types';
import { ShareButton } from '../components/ShareButton';
import styles from './ProposalDetailView.module.css';

interface ProposalDetailViewProps {
  proposalId: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function ProposalDetailView({ proposalId, onNavigate, onBack }: ProposalDetailViewProps) {
  const { data: proposal, isLoading, error } = useProposal(proposalId);
  const { isConnected } = useAccount();
  const { voteRefundable, isPending } = useVote();
  const [reason, setReason] = useState('');

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load proposal</p>
      </div>
    );
  }

  if (isLoading || !proposal) {
    return (
      <div className={styles.loading}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Loading proposal...</p>
      </div>
    );
  }

  const forVotes = Number(proposal.forVotes);
  const againstVotes = Number(proposal.againstVotes);
  const abstainVotes = Number(proposal.abstainVotes);
  const totalVotes = forVotes + againstVotes + abstainVotes;
  const quorum = Number(proposal.quorumVotes);

  const handleVote = (support: number) => {
    // Use voteRefundable which includes reason and gas refund
    voteRefundable(BigInt(proposalId), support as 0 | 1 | 2, reason);
  };

  const isActive = proposal.status === 'ACTIVE' || proposal.status === 'OBJECTION_PERIOD';

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <ShareButton path={`proposal/${proposalId}`} />
      </div>

      <div className={styles.header}>
        <span className={styles.id}>Proposal #{proposal.id}</span>
        <span className={`${styles.status} ${styles[proposal.status.toLowerCase()]}`}>
          {proposal.status}
        </span>
      </div>

      <h1 className={styles.title}>{proposal.title}</h1>

      {/* Vote Counts */}
      <div className={styles.voteSection}>
        <div className={styles.voteCounts}>
          <div className={styles.voteCount}>
            <span className={styles.voteValue} style={{ color: '#43a047' }}>{forVotes}</span>
            <span className={styles.voteLabel}>For</span>
          </div>
          <div className={styles.voteCount}>
            <span className={styles.voteValue} style={{ color: '#e53935' }}>{againstVotes}</span>
            <span className={styles.voteLabel}>Against</span>
          </div>
          <div className={styles.voteCount}>
            <span className={styles.voteValue} style={{ color: '#757575' }}>{abstainVotes}</span>
            <span className={styles.voteLabel}>Abstain</span>
          </div>
        </div>
        
        <div className={styles.quorum}>
          Quorum: {totalVotes} / {quorum}
        </div>
      </div>

      {/* Vote Actions */}
      {isConnected && isActive && (
        <div className={styles.voteActions}>
          <textarea
            className={styles.reasonInput}
            placeholder="Optional: Add a reason for your vote..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.voteButtons}>
            <button 
              className={`${styles.voteButton} ${styles.voteFor}`}
              onClick={() => handleVote(1)}
              disabled={isPending}
            >
              Vote For
            </button>
            <button 
              className={`${styles.voteButton} ${styles.voteAgainst}`}
              onClick={() => handleVote(0)}
              disabled={isPending}
            >
              Vote Against
            </button>
            <button 
              className={`${styles.voteButton} ${styles.voteAbstain}`}
              onClick={() => handleVote(2)}
              disabled={isPending}
            >
              Abstain
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      <div className={styles.description}>
        <h2 className={styles.sectionTitle}>Description</h2>
        <div className={styles.descriptionContent}>
          {proposal.description}
        </div>
      </div>

      {/* Votes List */}
      {proposal.votes && proposal.votes.length > 0 && (
        <div className={styles.votesSection}>
          <h2 className={styles.sectionTitle}>Votes ({proposal.votes.length})</h2>
          <div className={styles.votesList}>
            {proposal.votes.map((v: any) => (
              <div 
                key={v.id} 
                className={styles.voteItem}
                onClick={() => onNavigate(`voter/${v.voter}`)}
              >
                <div className={styles.voteItemHeader}>
                  <span className={styles.voterAddress}>
                    {v.voter.slice(0, 6)}...{v.voter.slice(-4)}
                  </span>
                  <span 
                    className={styles.voteSupport}
                    style={{ color: getSupportColor(v.support) }}
                  >
                    {getSupportLabel(v.support)}
                  </span>
                  <span className={styles.voteVotes}>{v.votes} votes</span>
                </div>
                {v.reason && (
                  <div className={styles.voteReason}>"{v.reason}"</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

