/**
 * ProposalListView
 * List of all proposals with filtering
 * Styled to match the Digest component's proposal feed
 */

'use client';

import { useState, useMemo } from 'react';
import { useEnsName, useBlockNumber } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useProposals } from '../hooks';
import { getClientName } from '@/OS/lib/clientNames';
import { BerryLoader } from '../components/BerryLoader';
import type { Proposal, ProposalFilter, ProposalSort } from '../types';
import styles from './ProposalListView.module.css';

/**
 * ENSName - Resolves and displays ENS name for an address
 */
function ENSName({ address }: { address: string }) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  return <>{ensName || `${address.slice(0, 6)}...${address.slice(-4)}`}</>;
}

/**
 * Format relative time (e.g., "Ends in 5 hours", "Starts in 2 days")
 */
function formatRelativeTime(timestamp: number, prefix: string): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = timestamp - now;
  
  if (diff < 0) {
    return 'Ended';
  }
  
  if (diff < 3600) {
    const mins = Math.floor(diff / 60);
    return `${prefix} ${mins} minute${mins !== 1 ? 's' : ''}`;
  }
  
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    return `${prefix} ${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  const days = Math.floor(diff / 86400);
  return `${prefix} ${days} day${days !== 1 ? 's' : ''}`;
}

/**
 * Calculate end time from endBlock (rough estimate: 12 sec/block)
 */
function estimateEndTime(endBlock: string, currentBlock: number): number {
  const blocksRemaining = Number(endBlock) - currentBlock;
  const secondsRemaining = blocksRemaining * 12;
  return Math.floor(Date.now() / 1000) + secondsRemaining;
}

/**
 * Calculate start time from startBlock (rough estimate: 12 sec/block)
 */
function estimateStartTime(startBlock: string, currentBlock: number): number {
  const blocksUntilStart = Number(startBlock) - currentBlock;
  const secondsUntilStart = blocksUntilStart * 12;
  return Math.floor(Date.now() / 1000) + secondsUntilStart;
}

interface ProposalListViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
}

export function ProposalListView({ onNavigate, onBack }: ProposalListViewProps) {
  const [filter, setFilter] = useState<ProposalFilter>('all');
  const [sort, setSort] = useState<ProposalSort>('newest');

  const { data: proposals, isLoading, error } = useProposals(50, filter, sort);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  
  // Estimate current block using a post-Merge reference point.
  // Block 21,000,000 was at timestamp 1733438615 (Dec 5, 2024). Since the Merge, blocks are exactly 12s apart.
  const estimatedBlock = useMemo(() => {
    const referenceBlock = 21000000;
    const referenceTimestamp = 1733438615; // Dec 5, 2024
    const secondsSinceReference = Math.floor(Date.now() / 1000) - referenceTimestamp;
    const blocksSinceReference = Math.floor(secondsSinceReference / 12);
    return referenceBlock + blocksSinceReference;
  }, []);
  
  // Use actual block number from chain, or estimated if not available yet
  const currentBlock = blockNumber ? Number(blockNumber) : estimatedBlock;

  const handleProposalClick = (proposal: Proposal) => {
    onNavigate(`proposal/${proposal.id}`);
  };
  
  const renderProposalItem = (proposal: Proposal) => {
    const forVotes = Number(proposal.forVotes);
    const againstVotes = Number(proposal.againstVotes);
    const abstainVotes = Number(proposal.abstainVotes || 0);
    const quorum = Number(proposal.quorumVotes) || 1;
    
    // Calculate bar widths
    const leftExtent = Math.max(forVotes, quorum);
    const rightExtent = abstainVotes + againstVotes;
    const totalScale = leftExtent + rightExtent || 1;
    
    const forWidth = (forVotes / totalScale) * 100;
    const quorumPosition = (quorum / totalScale) * 100;
    const abstainWidth = (abstainVotes / totalScale) * 100;
    const againstWidth = (againstVotes / totalScale) * 100;
    const gapWidth = forVotes < quorum ? quorumPosition - forWidth : 0;
    
    const isPending = ['PENDING', 'UPDATABLE'].includes(proposal.status);
    const isQueued = proposal.status === 'QUEUED';
    const isExecuted = proposal.status === 'EXECUTED';
    const isCancelled = proposal.status === 'CANCELLED';
    const isVetoed = proposal.status === 'VETOED';
    
    // Check if voting period has actually ended (endBlock has passed)
    const votingEnded = Number(proposal.endBlock) <= currentBlock;
    
    // isActive means status is ACTIVE/OBJECTION_PERIOD AND voting hasn't ended yet
    const isActive = ['ACTIVE', 'OBJECTION_PERIOD'].includes(proposal.status) && !votingEnded;
    
    // Calculate outcome for proposals where voting has ended
    // Defeated: didn't meet quorum OR more against than for
    const isDefeated = proposal.status === 'DEFEATED' || (
      votingEnded && 
      !isQueued && !isExecuted && !isCancelled && !isVetoed &&
      (forVotes < quorum || againstVotes > forVotes)
    );
    
    // Succeeded: voting ended, met quorum, more for than against, but not yet queued/executed
    const isSucceeded = proposal.status === 'SUCCEEDED' || (
      votingEnded &&
      !isQueued && !isExecuted && !isCancelled && !isVetoed && !isDefeated &&
      forVotes >= quorum && forVotes > againstVotes
    );
    
    const endTime = estimateEndTime(proposal.endBlock, currentBlock);
    const startTime = estimateStartTime(proposal.startBlock, currentBlock);
    
    // Determine status display - order matters!
    // Check terminal states first, then calculated states, then active states
    const getStatusBadge = () => {
      if (isExecuted) return { label: 'EXECUTED', className: styles.executed };
      if (isCancelled) return { label: 'CANCELLED', className: styles.cancelled };
      if (isVetoed) return { label: 'VETOED', className: styles.cancelled };
      if (isQueued) return { label: 'QUEUED', className: styles.queued };
      if (isDefeated) return { label: 'DEFEATED', className: styles.defeated };
      if (isSucceeded) return { label: 'SUCCEEDED', className: styles.succeeded };
      if (isActive) return { label: 'ONGOING', className: styles.ongoing };
      if (isPending) return { label: 'UPCOMING', className: styles.upcoming };
      return null;
    };
    
    const statusBadge = getStatusBadge();
    
    return (
      <div 
        key={proposal.id} 
        className={styles.proposalItem}
        onClick={() => handleProposalClick(proposal)}
      >
        <div className={styles.proposalMeta}>
          Prop {proposal.id} by <span className={styles.proposer}><ENSName address={proposal.proposer} /></span>
          {proposal.clientId != null && proposal.clientId !== 0 && (
            <span className={styles.clientBadge}>via {getClientName(proposal.clientId)}</span>
          )}
        </div>
        
        <div className={styles.proposalTitle}>{proposal.title}</div>
        
        {/* Vote bar for active/ongoing proposals */}
        {isActive && (
          <div className={styles.voteBar}>
            <div className={styles.forSection} style={{ width: `${forWidth}%` }} />
            {gapWidth > 0 && <div className={styles.quorumSpace} style={{ width: `${gapWidth}%` }} />}
            <div className={styles.quorumMarker} style={{ left: `${quorumPosition}%` }} />
            {abstainVotes > 0 && <div className={styles.abstainSection} style={{ width: `${abstainWidth}%` }} />}
            {againstVotes > 0 && <div className={styles.againstSection} style={{ width: `${againstWidth}%` }} />}
          </div>
        )}
        
        {/* Status and stats */}
        <div className={styles.proposalStats}>
          {/* Badge on left for active/pending proposals */}
          {statusBadge && !votingEnded && (
            <span className={`${styles.statusBadge} ${statusBadge.className}`}>{statusBadge.label}</span>
          )}
          
          {/* Show vote counts for active proposals */}
          {isActive && (
            <>
              <span className={styles.voteCount}>{forVotes} ↑ / {quorum}</span>
              {abstainVotes > 0 && <span className={styles.voteCount}>{abstainVotes}</span>}
              {againstVotes > 0 && <span className={styles.voteCount}>{againstVotes} ↓</span>}
              <span className={styles.timeRemaining}>{formatRelativeTime(endTime, 'Ends in')}</span>
            </>
          )}
          
          {/* Show start time for pending */}
          {isPending && (
            <span className={styles.timeRemaining}>{formatRelativeTime(startTime, 'Starts in')}</span>
          )}
          
          {/* Badge on right for ended proposals */}
          {statusBadge && votingEnded && (
            <span className={`${styles.statusBadge} ${styles.rightAligned} ${statusBadge.className}`}>{statusBadge.label}</span>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={styles.error}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
        <p>Failed to load proposals</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
      </div>
      <div className={styles.controls}>
        <select
          className={styles.select}
          value={filter}
          onChange={(e) => setFilter(e.target.value as ProposalFilter)}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="succeeded">Succeeded</option>
          <option value="defeated">Defeated</option>
          <option value="executed">Executed</option>
        </select>

        <select
          className={styles.select}
          value={sort}
          onChange={(e) => setSort(e.target.value as ProposalSort)}
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="ending_soon">Ending Soon</option>
        </select>
      </div>

      <div className={styles.list}>
        {isLoading ? (
          <BerryLoader />
        ) : proposals && proposals.length > 0 ? (
          proposals.map(proposal => renderProposalItem(proposal))
        ) : (
          <div className={styles.empty}>No proposals found</div>
        )}
      </div>
    </div>
  );
}
