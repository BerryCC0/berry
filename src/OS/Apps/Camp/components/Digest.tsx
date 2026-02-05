/**
 * Digest Component
 * Shows proposals and candidates grouped by state/priority
 * Compact view for the Activity sidebar
 */

'use client';

import { useState, useMemo } from 'react';
import { useAccount, useBlockNumber, useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { useProposals, useCandidates, useVoter, useVoters } from '../hooks';
import type { Proposal, Candidate, Voter } from '../types';
import styles from './Digest.module.css';

// Treasury addresses to filter from voter list
const TREASURY_ADDRESSES = [
  '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71', // treasury (nouns.eth)
  '0x0bc3807ec262cb779b38d65b38158acc3bfede10', // treasuryV1
];

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
}

type DigestTab = 'digest' | 'proposals' | 'candidates' | 'voters';

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

interface DigestSection {
  id: string;
  title: string;
  subtitle?: string;
  items: (Proposal | Candidate)[];
  type: 'proposal' | 'candidate';
  collapsed: boolean;
}

export function Digest({ onNavigate }: DigestProps) {
  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<DigestTab>('digest');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['ongoing']));
  
  // Fetch data
  const { data: proposals, isLoading: proposalsLoading, error: proposalsError } = useProposals(50, 'all', 'newest');
  const { data: candidates, isLoading: candidatesLoading, error: candidatesError } = useCandidates(50);
  const { data: voters, isLoading: votersLoading, error: votersError } = useVoters(50, 'power');
  const { data: voterData } = useVoter(address || null);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  
  // Combined loading/error states
  const isLoading = proposalsLoading || candidatesLoading;
  const hasError = proposalsError || candidatesError;
  
  // Estimate current block: Block 19,000,000 was Jan 17, 2024 (timestamp 1705500000)
  // ~12 seconds per block since then
  const estimatedBlock = useMemo(() => {
    const referenceBlock = 19000000;
    const referenceTimestamp = 1705500000; // Jan 17, 2024
    const secondsSinceReference = Math.floor(Date.now() / 1000) - referenceTimestamp;
    const blocksSinceReference = Math.floor(secondsSinceReference / 12);
    return referenceBlock + blocksSinceReference;
  }, []);
  
  // Use actual block number from chain, or estimated if not available yet
  const currentBlock = blockNumber ? Number(blockNumber) : estimatedBlock;
  
  // Get proposals the user has already voted on
  const votedProposalIds = useMemo(() => {
    if (!voterData?.recentVotes) return new Set<string>();
    return new Set(voterData.recentVotes.map((v: { proposalId: string }) => v.proposalId));
  }, [voterData]);
  
  // Group proposals and candidates into sections
  const sections = useMemo<DigestSection[]>(() => {
    if (!proposals) return [];
    
    const result: DigestSection[] = [];
    
    // Helper to check if proposal voting is still active
    // Must have active status AND endBlock must not have passed
    const isVotingActive = (p: Proposal) => 
      ['ACTIVE', 'OBJECTION_PERIOD'].includes(p.status) && 
      Number(p.endBlock) > currentBlock;
    
    // Active proposals user hasn't voted on
    const notVoted = proposals.filter(p => 
      isVotingActive(p) && 
      address && 
      !votedProposalIds.has(p.id)
    );
    
    if (notVoted.length > 0) {
      result.push({
        id: 'not-voted',
        title: 'NOT YET VOTED',
        items: notVoted,
        type: 'proposal',
        collapsed: collapsedSections.has('not-voted'),
      });
    }
    
    // Ongoing proposals (currently voting)
    const ongoing = proposals.filter(p => isVotingActive(p));
    
    if (ongoing.length > 0) {
      result.push({
        id: 'ongoing',
        title: 'ONGOING PROPOSALS',
        subtitle: 'Currently voting',
        items: ongoing,
        type: 'proposal',
        collapsed: collapsedSections.has('ongoing'),
      });
    }
    
    // Upcoming proposals (pending/updatable)
    const upcoming = proposals.filter(p => 
      ['PENDING', 'UPDATABLE'].includes(p.status)
    );
    
    if (upcoming.length > 0) {
      result.push({
        id: 'upcoming',
        title: 'UPCOMING PROPOSALS',
        items: upcoming,
        type: 'proposal',
        collapsed: collapsedSections.has('upcoming'),
      });
    }
    
    // New candidates (created in last 7 days)
    if (candidates && candidates.length > 0) {
      const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const newCandidates = candidates.filter(c => 
        Number(c.createdTimestamp) > oneWeekAgo
      );
      
      if (newCandidates.length > 0) {
        result.push({
          id: 'new-candidates',
          title: 'NEW CANDIDATES',
          subtitle: 'Created within the last 7 days',
          items: newCandidates,
          type: 'candidate',
          collapsed: collapsedSections.has('new-candidates'),
        });
      }
    }
    
    return result;
  }, [proposals, candidates, address, votedProposalIds, collapsedSections]);
  
  const toggleSection = (sectionId: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };
  
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
  
  // Filter out treasury addresses from voters
  const filteredVoters = useMemo(() => {
    if (!voters) return [];
    return voters.filter(v => !TREASURY_ADDRESSES.includes(v.id.toLowerCase()));
  }, [voters]);
  
  // Render content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'proposals':
        if (proposalsLoading) return <div className={styles.loading}>Loading proposals...</div>;
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
        if (candidatesLoading) return <div className={styles.loading}>Loading candidates...</div>;
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
        if (votersLoading) return <div className={styles.loading}>Loading voters...</div>;
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
        if (isLoading) return <div className={styles.loading}>Loading...</div>;
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
      {/* Tabs */}
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
      
      {/* Content */}
      <div className={styles.content}>
        {renderTabContent()}
      </div>
    </div>
  );
}

function formatSlugToTitle(slug: string): string {
  return slug
    .replace(/---+/g, ' - ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/^./, c => c.toUpperCase());
}
