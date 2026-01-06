/**
 * ProposalDetailView
 * Full proposal detail with voting
 */

'use client';

import { useState, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { useProposal } from '../hooks';
import { useSimulation } from '../hooks/useSimulation';
import { useVote } from '@/app/lib/nouns/hooks';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { SimulationStatus } from '../components/SimulationStatus';
import { VoterRow } from '../components/VoterRow';
import styles from './ProposalDetailView.module.css';

interface ProposalDetailViewProps {
  proposalId: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
}

// Statuses where simulation doesn't make sense (already finalized)
const SKIP_SIMULATION_STATUSES = ['EXECUTED', 'DEFEATED', 'VETOED', 'CANCELLED', 'EXPIRED'];

export function ProposalDetailView({ proposalId, onNavigate, onBack }: ProposalDetailViewProps) {
  const { data: proposal, isLoading, error } = useProposal(proposalId);
  const { isConnected } = useAccount();
  const { voteRefundable, isPending } = useVote();
  const [reason, setReason] = useState('');
  
  // Only simulate for proposals that could still be executed
  const shouldSkipSimulation = proposal ? SKIP_SIMULATION_STATUSES.includes(proposal.status) : false;
  const simulation = useSimulation(shouldSkipSimulation ? undefined : proposal?.actions);

  // Combine votes and feedback into one sorted activity feed
  // Must be called before any early returns to maintain hook order
  const activity = useMemo(() => {
    if (!proposal) return [];
    
    const items: Array<{
      id: string;
      type: 'vote' | 'feedback';
      address: string;
      support: number;
      votes: string;
      reason: string | null;
      timestamp: string;
    }> = [];

    // Add votes
    for (const v of proposal.votes || []) {
      items.push({
        id: `vote-${v.id}`,
        type: 'vote',
        address: v.voter,
        support: v.support,
        votes: v.votes,
        reason: v.reason,
        timestamp: v.blockTimestamp,
      });
    }

    // Add feedback
    for (const f of proposal.feedback || []) {
      items.push({
        id: `feedback-${f.id}`,
        type: 'feedback',
        address: f.voter,
        support: f.support,
        votes: f.votes,
        reason: f.reason,
        timestamp: f.createdTimestamp,
      });
    }

    // Sort by timestamp descending (newest first)
    items.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

    return items;
  }, [proposal]);

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
  const quorum = Number(proposal.quorumVotes) || 1;

  // Calculate scale: the max extent we need to show
  // Left side is max of forVotes or quorum (to show gap if needed)
  const leftExtent = Math.max(forVotes, quorum);
  const rightExtent = abstainVotes + againstVotes;
  const totalScale = leftExtent + rightExtent;

  // Calculate widths as percentages of total scale
  const forWidth = totalScale > 0 ? (forVotes / totalScale) * 100 : 0;
  const quorumPosition = totalScale > 0 ? (quorum / totalScale) * 100 : 50;
  const abstainWidth = totalScale > 0 ? (abstainVotes / totalScale) * 100 : 0;
  const againstWidth = totalScale > 0 ? (againstVotes / totalScale) * 100 : 0;
  
  // Gap between For and quorum marker (only if For < quorum)
  const gapWidth = forVotes < quorum ? quorumPosition - forWidth : 0;
  const quorumMet = forVotes >= quorum;

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

      {/* Two-column layout on desktop */}
      <div className={styles.columns}>
        {/* Left Column: Description */}
        <div className={styles.leftColumn}>
          <div className={styles.description}>
            <h2 className={styles.sectionTitle}>Description</h2>
            <MarkdownRenderer 
              content={proposal.description} 
              className={styles.descriptionContent}
            />
          </div>
        </div>

        {/* Right Column: Simulation, Votes, Actions */}
        <div className={styles.rightColumn}>
          {/* Simulation Status / Transaction List */}
          <SimulationStatus
            result={simulation.result}
            isLoading={simulation.isLoading}
            error={simulation.error}
            hasActions={simulation.hasActions}
            actions={proposal.actions}
            skipSimulation={shouldSkipSimulation}
          />

          {/* Vote Counts */}
          <div className={styles.voteSection}>
            {/* Vote labels row */}
            <div className={styles.voteLabelsRow}>
              <span className={styles.forLabel}>For {forVotes}</span>
              <span className={styles.rightLabels}>
                {abstainVotes > 0 && (
                  <span className={styles.abstainLabel}>Abstain {abstainVotes}</span>
                )}
                {abstainVotes > 0 && againstVotes > 0 && <span className={styles.labelSeparator}>·</span>}
                {againstVotes > 0 && (
                  <span className={styles.againstLabel}>Against {againstVotes}</span>
                )}
              </span>
            </div>

            {/* Vote bar with individual blocks */}
            <div className={styles.voteBarContainer}>
              {/* For votes (left aligned) - each voter is a block */}
              <div 
                className={styles.forSection}
                style={{ width: `${forWidth}%` }}
              >
                {(proposal.votes || [])
                  .filter((v: { support: number }) => v.support === 1)
                  .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
                  .map((v: { id: string; votes: string }) => (
                    <div 
                      key={`for-${v.id}`}
                      className={styles.voteBlock}
                      style={{ 
                        flex: Number(v.votes),
                        backgroundColor: '#43a047',
                      }}
                    />
                  ))}
              </div>
              
              {/* Gap to quorum (only if For < quorum) */}
              {gapWidth > 0 && (
                <div 
                  className={styles.quorumSpace} 
                  style={{ width: `${gapWidth}%` }}
                />
              )}

              {/* Quorum marker - absolutely positioned */}
              <div 
                className={styles.quorumMarker} 
                style={{ left: `${quorumPosition}%` }}
              />

              {/* Abstain votes (gray) */}
              {abstainVotes > 0 && (
                <div 
                  className={styles.abstainSection}
                  style={{ width: `${abstainWidth}%` }}
                >
                  {(proposal.votes || [])
                    .filter((v: { support: number }) => v.support === 2)
                    .map((v: { id: string; votes: string }) => (
                      <div 
                        key={`abstain-${v.id}`}
                        className={styles.voteBlock}
                        style={{ 
                          flex: Number(v.votes),
                          backgroundColor: '#757575',
                        }}
                      />
                    ))}
                </div>
              )}

              {/* Against votes (red) */}
              {againstVotes > 0 && (
                <div 
                  className={styles.againstSection}
                  style={{ width: `${againstWidth}%` }}
                >
                  {(proposal.votes || [])
                    .filter((v: { support: number }) => v.support === 0)
                    .sort((a: { votes: string }, b: { votes: string }) => Number(b.votes) - Number(a.votes))
                    .map((v: { id: string; votes: string }) => (
                      <div 
                        key={`against-${v.id}`}
                        className={styles.voteBlock}
                        style={{ 
                          flex: Number(v.votes),
                          backgroundColor: '#e53935',
                        }}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Quorum row */}
            <div className={styles.quorumRow}>
              <span className={styles.quorumLabel}>
                Quorum {quorum} {quorumMet ? '(met)' : ''}
              </span>
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

          {/* Activity (Votes + Feedback combined) */}
          {activity.length > 0 && (
            <div className={styles.activitySection}>
              <h2 className={styles.sectionTitle}>
                Activity ({activity.length})
              </h2>
              <div className={styles.activityList}>
                {activity.map((item) => (
                  <VoterRow
                    key={item.id}
                    address={item.address}
                    support={item.support}
                    votes={item.votes}
                    reason={item.reason}
                    timestamp={item.timestamp}
                    isFeedback={item.type === 'feedback'}
                    onNavigate={onNavigate}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

