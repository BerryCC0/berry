/**
 * useDigest Hook
 * Encapsulates all business logic for the Digest component:
 * - Data fetching (proposals, candidates, voters, voter, block number)
 * - Block estimation
 * - Section grouping (NOT YET VOTED, ONGOING, UPCOMING, NEW CANDIDATES)
 * - Voted proposal tracking
 * - Voter filtering (treasury address exclusion)
 * - Tab state management (controlled vs internal)
 * - Collapsed section state
 * - Loading/error state derivation
 */

'use client';

import { useState, useMemo } from 'react';
import { useAccount, useBlockNumber } from 'wagmi';
import { useProposals, useCandidates, useVoter, useVoters } from './index';
import { estimateEndTime, estimateStartTime, formatRelativeTime } from '../utils/formatUtils';
import type { Proposal, Candidate, Voter, DigestTab, DigestSection } from '../types';

// Treasury addresses to filter from voter list
const TREASURY_ADDRESSES = [
  '0xb1a32fc9f9d8b2cf86c068cae13108809547ef71', // treasury (nouns.eth)
  '0x0bc3807ec262cb779b38d65b38158acc3bfede10', // treasuryV1
];

interface UseDigestProps {
  activeTab?: DigestTab;
  onTabChange?: (tab: DigestTab) => void;
}

export interface UseDigestReturn {
  // Tab state
  activeTab: DigestTab;
  setActiveTab: (tab: DigestTab) => void;
  
  // Data
  proposals: Proposal[] | undefined;
  candidates: Candidate[] | undefined;
  filteredVoters: Voter[];
  sections: DigestSection[];
  currentBlock: number;
  
  // Loading/error states
  isLoading: boolean;
  hasError: boolean;
  proposalsLoading: boolean;
  proposalsError: unknown;
  candidatesLoading: boolean;
  candidatesError: unknown;
  votersLoading: boolean;
  votersError: unknown;
  
  // Section management
  toggleSection: (sectionId: string) => void;
  
  // Utility functions (bound to current state)
  getEndTime: (endBlock: string) => number;
  getStartTime: (startBlock: string) => number;
  getRelativeTime: (timestamp: number, prefix: string) => string;
}

export function useDigest({ activeTab: controlledTab, onTabChange }: UseDigestProps = {}): UseDigestReturn {
  const { address } = useAccount();
  const [internalTab, setInternalTab] = useState<DigestTab>('digest');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set(['ongoing']));
  
  // Use controlled state if provided, otherwise use internal state
  const activeTab = controlledTab ?? internalTab;
  const setActiveTab = onTabChange ?? setInternalTab;
  
  // Fetch data
  const { data: proposals, isLoading: proposalsLoading, error: proposalsError } = useProposals(50, 'all', 'newest');
  const { data: candidates, isLoading: candidatesLoading, error: candidatesError } = useCandidates(50);
  const { data: voters, isLoading: votersLoading, error: votersError } = useVoters(50, 'power');
  const { data: voterData } = useVoter(address || null);
  const { data: blockNumber } = useBlockNumber({ watch: true });
  
  // Combined loading/error states
  const isLoading = proposalsLoading || candidatesLoading;
  const hasError = !!(proposalsError || candidatesError);
  
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
  }, [proposals, candidates, address, votedProposalIds, collapsedSections, currentBlock]);
  
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
  
  // Filter out treasury addresses from voters
  const filteredVoters = useMemo(() => {
    if (!voters) return [];
    return voters.filter(v => !TREASURY_ADDRESSES.includes(v.id.toLowerCase()));
  }, [voters]);
  
  // Bound utility functions
  const getEndTime = (endBlock: string) => estimateEndTime(endBlock, currentBlock);
  const getStartTime = (startBlock: string) => estimateStartTime(startBlock, currentBlock);
  const getRelativeTime = (timestamp: number, prefix: string) => formatRelativeTime(timestamp, prefix);
  
  return {
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
  };
}
