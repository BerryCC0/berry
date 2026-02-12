/**
 * Digest Component
 * Shows proposals and candidates grouped by state/priority
 * Compact view for the Activity sidebar
 * 
 * Business logic is in useDigest hook.
 * This file contains only presentation logic.
 */

'use client';

import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useDigest } from '../hooks/useDigest';
import { formatSlugToTitle } from '../utils/formatUtils';
import { getClientName } from '@/OS/lib/clientNames';
import { BerryLoader } from './BerryLoader';
import type { Proposal, Candidate, Voter, DigestTab } from '../types';
import styles from './Digest.module.css';

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
 * VoterIdentity - Shows ENS avatar and name for a voter
 */
function VoterIdentity({ address }: { address: string }) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || undefined,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  return (
    <div className={styles.voterIdentity}>
      {ensAvatar ? (
        <img src={ensAvatar} alt="" className={styles.voterAvatar} />
      ) : (
        <div className={styles.voterAvatarPlaceholder} />
      )}
      <span className={styles.voterName}>{displayName}</span>
    </div>
  );
}

interface DigestProps {
  onNavigate: (path: string) => void;
  activeTab?: DigestTab;
  onTabChange?: (tab: DigestTab) => void;
  /** When true, the internal tab bar is hidden (used when parent provides its own tabs) */
  hideTabs?: boolean;
}

export function Digest({ onNavigate, activeTab: controlledTab, onTabChange, hideTabs }: DigestProps) {
  const {
    activeTab,
    setActiveTab,
    proposals,
    candidates,
    filteredVoters,
    sections,
    currentBlock,
    isLoading,
    hasError,
    proposalsLoading,
    proposalsError,
    candidatesLoading,
    candidatesError,
    votersLoading,
    votersError,
    toggleSection,
    getEndTime,
    getStartTime,
    getRelativeTime,
  } = useDigest({ activeTab: controlledTab, onTabChange });
  
  const handleProposalClick = (proposal: Proposal) => {
    onNavigate(`proposal/${proposal.id}`);
  };
  
  const handleCandidateClick = (candidate: Candidate) => {
    onNavigate(`c/${candidate.slug}`);
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
    
    const endTime = getEndTime(proposal.endBlock);
    const startTime = getStartTime(proposal.startBlock);
    
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
          {/* Badge on left only for upcoming/pending proposals */}
          {statusBadge && isPending && (
            <span className={`${styles.statusBadge} ${statusBadge.className}`}>{statusBadge.label}</span>
          )}
          
          {/* Show vote counts for active proposals */}
          {isActive && (
            <>
              <span className={styles.voteCount}>{forVotes} ↑ / {quorum}</span>
              {abstainVotes > 0 && <span className={styles.voteCount}>{abstainVotes}</span>}
              {againstVotes > 0 && <span className={styles.voteCount}>{againstVotes} ↓</span>}
              <span className={styles.timeRemaining}>{getRelativeTime(endTime, 'Ends in')}</span>
            </>
          )}
          
          {/* Show start time for pending */}
          {isPending && (
            <span className={styles.timeRemaining}>{getRelativeTime(startTime, 'Starts in')}</span>
          )}
          
          {/* Badge on right for all non-pending proposals */}
          {statusBadge && !isPending && (
            <span className={`${styles.statusBadge} ${styles.rightAligned} ${statusBadge.className}`}>{statusBadge.label}</span>
          )}
        </div>
      </div>
    );
  };
  
  const renderCandidateItem = (candidate: Candidate) => {
    const sponsorCount = candidate.signatures?.filter(s => !s.canceled).length || 0;
    const thresholdMet = sponsorCount >= 2; // Simplified threshold check
    
    return (
      <div 
        key={`${candidate.proposer}-${candidate.slug}`}
        className={styles.candidateItem}
        onClick={() => handleCandidateClick(candidate)}
      >
        <div className={styles.proposalMeta}>
          Candidate by <span className={styles.proposer}><ENSName address={candidate.proposer} /></span>
          {thresholdMet && <span className={styles.thresholdMet}> – Sponsor threshold met</span>}
        </div>
        
        <div className={styles.proposalTitle}>
          {candidate.title || formatSlugToTitle(candidate.slug)}
        </div>
      </div>
    );
  };
  
  const renderVoterItem = (voter: Voter) => {
    const votes = Number(voter.delegatedVotes);
    
    return (
      <div 
        key={voter.id}
        className={styles.voterItem}
        onClick={() => onNavigate(`voter/${voter.id}`)}
      >
        <div className={styles.voterInfo}>
          <VoterIdentity address={voter.id} />
          <span className={styles.voterVotes}>{votes} vote{votes !== 1 ? 's' : ''}</span>
        </div>
      </div>
    );
  };
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'proposals':
        if (proposalsLoading) return <BerryLoader />;
        if (proposalsError) return <div className={styles.error}>Failed to load proposals</div>;
        return (
          <div className={styles.listContent}>
            {proposals?.map(proposal => renderProposalItem(proposal))}
            {(!proposals || proposals.length === 0) && (
              <div className={styles.empty}>No proposals found</div>
            )}
          </div>
        );
      
      case 'candidates':
        if (candidatesLoading) return <BerryLoader />;
        if (candidatesError) return <div className={styles.error}>Failed to load candidates</div>;
        return (
          <div className={styles.listContent}>
            {candidates?.map(candidate => renderCandidateItem(candidate))}
            {(!candidates || candidates.length === 0) && (
              <div className={styles.empty}>No candidates found</div>
            )}
          </div>
        );
      
      case 'voters':
        if (votersLoading) return <BerryLoader />;
        if (votersError) return <div className={styles.error}>Failed to load voters</div>;
        return (
          <div className={styles.listContent}>
            {filteredVoters.map(voter => renderVoterItem(voter))}
            {filteredVoters.length === 0 && (
              <div className={styles.empty}>No voters found</div>
            )}
          </div>
        );
      
      case 'digest':
      default:
        if (isLoading) return <BerryLoader />;
        if (hasError) return <div className={styles.error}>Failed to load data</div>;
        return (
          <>
            {sections.map(section => (
              <div key={section.id} className={styles.section}>
                <button 
                  className={styles.sectionHeader}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className={styles.chevron}>{section.collapsed ? '›' : '⌄'}</span>
                  <span className={styles.sectionTitle}>{section.title}</span>
                  {section.subtitle && (
                    <span className={styles.sectionSubtitle}> — {section.subtitle}</span>
                  )}
                </button>
                
                {!section.collapsed && (
                  <div className={styles.sectionContent}>
                    {section.type === 'proposal' 
                      ? section.items.map(item => renderProposalItem(item as Proposal))
                      : section.items.map(item => renderCandidateItem(item as Candidate))
                    }
                  </div>
                )}
              </div>
            ))}
            
            {sections.length === 0 && (
              <div className={styles.empty}>
                No active proposals or candidates
              </div>
            )}
          </>
        );
    }
  };
  
  return (
    <div className={styles.container}>
      {/* Tabs — hidden when parent provides its own tab bar */}
      {!hideTabs && (
        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'digest' ? styles.active : ''}`}
            onClick={() => setActiveTab('digest')}
          >
            Digest
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'proposals' ? styles.active : ''}`}
            onClick={() => setActiveTab('proposals')}
          >
            Proposals
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'candidates' ? styles.active : ''}`}
            onClick={() => setActiveTab('candidates')}
          >
            Candidates
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'voters' ? styles.active : ''}`}
            onClick={() => setActiveTab('voters')}
          >
            Voters
          </button>
        </div>
      )}
      
      {/* Content */}
      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}
