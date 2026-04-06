/**
 * ProposalListView
 * List of all proposals with filtering
 * Styled to match the Digest component's proposal feed
 */

'use client';

import { useState } from 'react';
import { useBlockNumber } from 'wagmi';
import { formatAddress } from '@/shared/format';
import { useEnsName } from '@/OS/hooks/useEnsData';
import { useProposals } from '../hooks';
import { getClientName } from '@/OS/lib/clientNames';
import { BerryLoader } from '../components/BerryLoader';
import { formatRelativeTime, estimateEndTime, estimateStartTime } from '../utils/formatUtils';
import { getProposalStatusBadge, getVoteBarWidths, estimateCurrentBlock } from '../utils/proposalStatus';
import { Toolbar, useToolbar, ToolbarBack, ToolbarTitle, ToolbarSelect } from '../components/CampToolbar';
import type { Proposal, ProposalFilter, ProposalSort } from '../types';
import type { CampToolbarContext } from '../Camp';
import styles from './ProposalListView.module.css';

/**
 * ENSName - Resolves and displays ENS name for an address
 */
function ENSName({ address }: { address: string }) {
  const ensName = useEnsName(address);

  return <>{formatAddress(address, ensName)}</>;
}


interface ProposalListViewProps {
  onNavigate: (path: string) => void;
  onBack: () => void;
  toolbar?: CampToolbarContext;
}

export function ProposalListView({ onNavigate, onBack, toolbar }: ProposalListViewProps) {
  const [filter, setFilter] = useState<ProposalFilter>('all');
  const [sort, setSort] = useState<ProposalSort>('newest');

  const { data: proposals, isLoading, error } = useProposals(50, filter, sort);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { isModern } = useToolbar();
  const tb = toolbar;

  // Use actual block number from chain, or estimated if not available yet
  const currentBlock = blockNumber ? Number(blockNumber) : estimateCurrentBlock();

  const handleProposalClick = (proposal: Proposal) => {
    onNavigate(`proposal/${proposal.id}`);
  };
  
  const renderProposalItem = (proposal: Proposal) => {
    // Get vote bar widths using shared utility
    const voteBar = getVoteBarWidths(
      proposal.forVotes,
      proposal.againstVotes,
      proposal.abstainVotes || '0',
      proposal.quorumVotes
    );
    const { forWidth, quorumPosition, abstainWidth, againstWidth, gapWidth } = voteBar;

    // Get status badge using shared utility
    const statusBadge = getProposalStatusBadge(
      proposal.status,
      proposal.forVotes,
      proposal.againstVotes,
      proposal.quorumVotes,
      proposal.endBlock,
      currentBlock
    );

    // Derive isActive and isPending from status badge for time display logic
    const isActive = statusBadge?.key === 'ongoing';
    const isPending = statusBadge?.key === 'upcoming';

    const endTime = estimateEndTime(proposal.endBlock, currentBlock);
    const startTime = estimateStartTime(proposal.startBlock, currentBlock);
    
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
            {Number(proposal.abstainVotes || 0) > 0 && <div className={styles.abstainSection} style={{ width: `${abstainWidth}%` }} />}
            {Number(proposal.againstVotes) > 0 && <div className={styles.againstSection} style={{ width: `${againstWidth}%` }} />}
          </div>
        )}
        
        {/* Status and stats */}
        <div className={styles.proposalStats}>
          {/* Badge on left only for upcoming/pending proposals */}
          {statusBadge && isPending && (
            <span className={`${styles.statusBadge} ${styles[statusBadge.key]}`}>{statusBadge.label}</span>
          )}

          {/* Show vote counts for active proposals */}
          {isActive && (
            <>
              <span className={styles.voteCount}>{Number(proposal.forVotes)} ↑ / {Number(proposal.quorumVotes) || 1}</span>
              {Number(proposal.abstainVotes || 0) > 0 && <span className={styles.voteCount}>{Number(proposal.abstainVotes)}</span>}
              {Number(proposal.againstVotes) > 0 && <span className={styles.voteCount}>{Number(proposal.againstVotes)} ↓</span>}
              <span className={styles.timeRemaining}>{formatRelativeTime(endTime, 'Ends in')}</span>
            </>
          )}

          {/* Show start time for pending */}
          {isPending && (
            <span className={styles.timeRemaining}>{formatRelativeTime(startTime, 'Starts in')}</span>
          )}

          {/* Badge on right for all non-pending proposals */}
          {statusBadge && !isPending && (
            <span className={`${styles.statusBadge} ${styles.rightAligned} ${styles[statusBadge.key]}`}>{statusBadge.label}</span>
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className={styles.error}>
        {tb && <Toolbar leading={<ToolbarBack onClick={onBack} styles={tb.styles} />} />}
        {!isModern && <button className={styles.backButton} onClick={onBack}>← Back</button>}
        <p>Failed to load proposals</p>
        <p className={styles.errorDetail}>{error.message}</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {tb && (
        <Toolbar
          leading={
            <>
              <ToolbarBack onClick={onBack} styles={tb.styles} />
              <ToolbarTitle styles={tb.styles}>Proposals</ToolbarTitle>
            </>
          }
          center={
            <>
              <ToolbarSelect
                value={filter}
                onChange={setFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'active', label: 'Active' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'succeeded', label: 'Succeeded' },
                  { value: 'defeated', label: 'Defeated' },
                  { value: 'executed', label: 'Executed' },
                ]}
                styles={tb.styles}
              />
              <ToolbarSelect
                value={sort}
                onChange={setSort}
                options={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'ending_soon', label: 'Ending Soon' },
                ]}
                styles={tb.styles}
              />
            </>
          }
        />
      )}
      {!isModern && <div className={styles.navBar}>
        <button className={styles.backButton} onClick={onBack}>← Back</button>
      </div>}
      {!isModern && <div className={styles.controls}>
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
      </div>}

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
