/**
 * VoterDetailView
 * Full voter/delegate profile with two-column layout
 */

'use client';

import { useState, useMemo } from 'react';
import { useEnsName, useEnsAvatar, useEnsAddress, useReadContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { normalize } from 'viem/ens';
import { NounImage } from '@/app/lib/nouns/components';
import { NOUNS_CONTRACTS } from '@/app/lib/nouns/contracts';
import { useVoter } from '../hooks';
import { getSupportLabel, getSupportColor } from '../types';
import { ShareButton } from '../components/ShareButton';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { DelegateModal } from '../components/DelegateModal';
import { BerryLoader } from '../components/BerryLoader';
import styles from './VoterDetailView.module.css';

/**
 * Estimate current block number
 * Block 19,000,000 was Jan 17, 2024 (timestamp 1705500000)
 * ~12 seconds per block since then
 */
function estimateCurrentBlock(): number {
  const referenceBlock = 19000000;
  const referenceTimestamp = 1705500000;
  const secondsSinceReference = Math.floor(Date.now() / 1000) - referenceTimestamp;
  const blocksSinceReference = Math.floor(secondsSinceReference / 12);
  return referenceBlock + blocksSinceReference;
}

/**
 * Calculate proposal status badge based on votes and block status
 */
function getProposalStatusBadge(
  status: string,
  forVotes: string,
  againstVotes: string,
  quorumVotes: string,
  endBlock: string,
  currentBlock: number
): { label: string; className: string } | null {
  const forVotesNum = Number(forVotes);
  const againstVotesNum = Number(againstVotes);
  const quorum = Number(quorumVotes) || 1;
  
  const isPending = ['PENDING', 'UPDATABLE'].includes(status);
  const isQueued = status === 'QUEUED';
  const isExecuted = status === 'EXECUTED';
  const isCancelled = status === 'CANCELLED';
  const isVetoed = status === 'VETOED';
  
  // Check if voting period has ended
  const votingEnded = Number(endBlock) <= currentBlock;
  
  // isActive means status is ACTIVE/OBJECTION_PERIOD AND voting hasn't ended yet
  const isActive = ['ACTIVE', 'OBJECTION_PERIOD'].includes(status) && !votingEnded;
  
  // Defeated: didn't meet quorum OR more against than for
  const isDefeated = status === 'DEFEATED' || (
    votingEnded && 
    !isQueued && !isExecuted && !isCancelled && !isVetoed &&
    (forVotesNum < quorum || againstVotesNum > forVotesNum)
  );
  
  // Succeeded: voting ended, met quorum, more for than against
  const isSucceeded = status === 'SUCCEEDED' || (
    votingEnded &&
    !isQueued && !isExecuted && !isCancelled && !isVetoed && !isDefeated &&
    forVotesNum >= quorum && forVotesNum > againstVotesNum
  );
  
  // Determine status - order matters!
  if (isExecuted) return { label: 'EXECUTED', className: 'statusEXECUTED' };
  if (isCancelled) return { label: 'CANCELLED', className: 'statusCANCELLED' };
  if (isVetoed) return { label: 'VETOED', className: 'statusVETOED' };
  if (isQueued) return { label: 'QUEUED', className: 'statusQUEUED' };
  if (isDefeated) return { label: 'DEFEATED', className: 'statusDEFEATED' };
  if (isSucceeded) return { label: 'SUCCEEDED', className: 'statusSUCCEEDED' };
  if (isActive) return { label: 'ACTIVE', className: 'statusACTIVE' };
  if (isPending) return { label: 'PENDING', className: 'statusPENDING' };
  return null;
}

/**
 * Check if input looks like an ENS name (not a hex address)
 */
function isEnsName(input: string): boolean {
  if (input.startsWith('0x') && input.length === 42) {
    return false;
  }
  return input.includes('.') || !input.startsWith('0x');
}

interface VoterDetailViewProps {
  address: string;
  onNavigate: (path: string) => void;
  onBack: () => void;
  showBackButton?: boolean;
  isOwnAccount?: boolean;
}

// Component to display an address with ENS resolution
function AddressLink({ 
  address, 
  onClick 
}: { 
  address: string; 
  onClick?: (e?: React.MouseEvent) => void;
}) {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });
  
  const displayName = ensName || `${address.slice(0, 6)}...${address.slice(-4)}`;
  
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick(e);
    }
  };
  
  return (
    <span 
      className={styles.addressLink} 
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {displayName}
    </span>
  );
}

type TabType = 'proposals' | 'candidates' | 'sponsored';

export function VoterDetailView({ address: addressInput, onNavigate, onBack, showBackButton = true, isOwnAccount = false }: VoterDetailViewProps) {
  const [showDelegateModal, setShowDelegateModal] = useState(false);
  const [activityFilter, setActivityFilter] = useState<'all' | 'with-reason'>('all');
  
  // Estimate current block for status calculations
  const currentBlock = useMemo(() => estimateCurrentBlock(), []);
  const [activeTab, setActiveTab] = useState<TabType>('proposals');
  
  // Determine if input is ENS name or address
  const inputIsEns = useMemo(() => isEnsName(addressInput), [addressInput]);
  
  // If input is ENS, resolve to address
  const { data: resolvedAddress, isLoading: isResolvingEns } = useEnsAddress({
    name: inputIsEns ? normalize(addressInput) : undefined,
    chainId: mainnet.id,
  });
  
  // The actual address to use for API calls
  const address = inputIsEns ? (resolvedAddress || null) : addressInput;
  
  // Fetch voter data using resolved address
  const { data: voter, isLoading: isLoadingVoter, error } = useVoter(address);
  
  // Get ENS name for display (if we have an address)
  const { data: ensName } = useEnsName({
    address: address as `0x${string}` | undefined,
    chainId: mainnet.id,
  });
  const { data: ensAvatar } = useEnsAvatar({
    name: ensName || (inputIsEns ? addressInput : undefined),
  });

  // Combined loading state
  const isLoading = isResolvingEns || isLoadingVoter;
  
  // Display name
  const displayName = inputIsEns 
    ? addressInput 
    : (ensName || (address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''));
  
  // Get owned Nouns
  const nounsOwned = voter?.nounsOwned || [];
  
  // Get Nouns delegated TO this address
  const nounsRepresented = voter?.nounsRepresented || [];
  
  // Get delegation info
  const delegatingTo = nounsOwned.length > 0 ? voter?.delegatingTo : null;
  const delegators = voter?.delegators || [];
  const isSelfDelegated = address && delegatingTo?.toLowerCase() === address.toLowerCase();
  
  // Show delegate button if viewing own account and they OWN Nouns
  const canDelegate = isOwnAccount && nounsOwned.length > 0;

  // Get proposals, candidates, and sponsored
  const proposals = voter?.proposals || [];
  const candidates = voter?.candidates || [];
  const sponsored = voter?.sponsored || [];

  // Calculate vote stats
  const recentVotes = voter?.recentVotes || [];
  const forVotes = recentVotes.filter((v: any) => v.support === 1).length;
  const againstVotes = recentVotes.filter((v: any) => v.support === 0).length;
  const abstainVotes = recentVotes.filter((v: any) => v.support === 2).length;
  const totalVotes = recentVotes.length;
  const votesWithReason = recentVotes.filter((v: any) => v.reason && v.reason.trim().length > 0).length;
  const reasonPercentage = totalVotes > 0 ? Math.round((votesWithReason / totalVotes) * 100) : 0;

  // Voting power and supply percentage
  const votingPower = Number(voter?.delegatedVotes || 0);

  // Fetch adjusted total supply from the governor for accurate percentage
  const { data: adjustedTotalSupply } = useReadContract({
    address: NOUNS_CONTRACTS.governor.address,
    abi: NOUNS_CONTRACTS.governor.abi,
    functionName: 'adjustedTotalSupply',
  });

  const supplyPercentage = adjustedTotalSupply
    ? ((votingPower / Number(adjustedTotalSupply)) * 100).toFixed(1)
    : null;

  // Filter activity
  const filteredVotes = activityFilter === 'with-reason' 
    ? recentVotes.filter((v: any) => v.reason && v.reason.trim().length > 0)
    : recentVotes;

  // Handle ENS resolution failure
  if (inputIsEns && !isResolvingEns && !resolvedAddress) {
    return (
      <div className={styles.error}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <p>Could not resolve ENS name: {addressInput}</p>
      </div>
    );
  }

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

  if (isLoading || !voter || !address) {
    return (
      <div className={styles.loading}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <BerryLoader />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Navigation */}
      <div className={styles.navBar}>
        {showBackButton && (
          <button className={styles.backButton} onClick={onBack}>← Back</button>
        )}
        <ShareButton path={`voter/${address}`} />
      </div>

      <div className={styles.twoColumn}>
        {/* LEFT COLUMN */}
        <div className={styles.leftColumn}>
          {/* Profile Header */}
          <div className={styles.profileHeader}>
            {ensAvatar && (
              <img src={ensAvatar} alt="" className={styles.avatar} />
            )}
            <div className={styles.profileMain}>
              <h1 className={styles.name}>{displayName}</h1>
              <span className={styles.address}>{address.slice(0, 6)}...{address.slice(-4)}</span>
            </div>
            <div className={styles.profileActions}>
              {canDelegate && (
                <button 
                  className={styles.delegateButton}
                  onClick={() => setShowDelegateModal(true)}
                >
                  Delegate
                </button>
              )}
            </div>
          </div>

          {/* Delegation Info */}
          {delegatingTo && !isSelfDelegated && (
            <div className={styles.delegatingTo}>
              <span className={styles.delegatingLabel}>Delegating to </span>
              <AddressLink 
                address={delegatingTo} 
                onClick={() => onNavigate(`voter/${delegatingTo}`)}
              />
            </div>
          )}

          {/* Delegators */}
          {delegators.length > 0 && (
            <div className={styles.delegatorsSection}>
              <span className={styles.delegatorsLabel}>Delegators ({delegators.length})</span>
              <div className={styles.delegatorsList}>
                {delegators.slice(0, 8).map((delegator) => (
                  <AddressLink 
                    key={delegator}
                    address={delegator} 
                    onClick={() => onNavigate(`voter/${delegator}`)}
                  />
                ))}
                {delegators.length > 8 && (
                  <span className={styles.moreCount}>+{delegators.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {/* Nouns Grid */}
          {nounsRepresented.length > 0 && (
            <div className={styles.nounsGrid}>
              {[...nounsRepresented]
                .sort((a, b) => Number(a.id) - Number(b.id))
                .map((noun) => (
                <div key={noun.id} className={styles.nounCard}>
                  {noun.seed ? (
                    <NounImage seed={noun.seed} size={48} className={styles.nounImage} />
                  ) : (
                    <div className={styles.nounImagePlaceholder} />
                  )}
                  <span className={styles.nounId}>{noun.id}</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className={styles.tabsSection}>
            <div className={styles.tabList}>
              <button
                className={`${styles.tab} ${activeTab === 'proposals' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('proposals')}
              >
                Proposals ({proposals.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'candidates' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('candidates')}
              >
                Candidates ({candidates.length})
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'sponsored' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('sponsored')}
              >
                Sponsored ({sponsored.length})
              </button>
            </div>

            <div className={styles.tabContent}>
              {activeTab === 'proposals' && (
                <div className={styles.proposalsList}>
                  {proposals.length === 0 ? (
                    <div className={styles.emptyTab}>No proposals</div>
                  ) : (
                    proposals.map((prop) => {
                      const statusBadge = getProposalStatusBadge(
                        prop.status,
                        prop.forVotes,
                        prop.againstVotes,
                        prop.quorumVotes,
                        prop.endBlock,
                        currentBlock
                      );
                      return (
                        <div
                          key={prop.id}
                          className={styles.proposalItem}
                          onClick={() => onNavigate(`proposal/${prop.id}`)}
                        >
                          <div className={styles.proposalHeader}>
                            <span className={styles.proposalId}>Prop {prop.id}</span>
                            <span className={styles.proposalSponsors}>
                              {prop.signers.length > 0 && (
                                <>sponsored by {prop.signers.slice(0, 2).map((s, i) => (
                                  <span key={s}>
                                    {i > 0 && ', '}
                                    <AddressLink address={s} />
                                  </span>
                                ))}
                                {prop.signers.length > 2 && ` +${prop.signers.length - 2}`}
                                </>
                              )}
                            </span>
                          </div>
                          <div className={styles.proposalTitle}>{prop.title}</div>
                          <div className={styles.proposalMeta}>
                            <span className={styles.proposalDate}>
                              {new Date(Number(prop.createdTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className={styles.proposalVotes}>
                              {prop.forVotes} ↑ / {prop.quorumVotes}
                              <span style={{ margin: '0 4px' }}>·</span>
                              {prop.abstainVotes}
                              <span style={{ margin: '0 4px' }}>·</span>
                              {prop.againstVotes} ↓
                            </span>
                            {statusBadge && (
                              <span className={`${styles.proposalStatus} ${styles[statusBadge.className]}`}>
                                {statusBadge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {activeTab === 'candidates' && (
                <div className={styles.candidatesList}>
                  {candidates.length === 0 ? (
                    <div className={styles.emptyTab}>No candidates</div>
                  ) : (
                    candidates.map((cand) => (
                      <div
                        key={cand.id}
                        className={styles.candidateItem}
                        onClick={() => onNavigate(`c/${cand.slug}`)}
                      >
                        <div className={styles.candidateTitle}>{cand.title}</div>
                        <div className={styles.candidateMeta}>
                          <span className={styles.candidateDate}>
                            {new Date(Number(cand.createdTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'sponsored' && (
                <div className={styles.proposalsList}>
                  {sponsored.length === 0 ? (
                    <div className={styles.emptyTab}>No sponsored proposals</div>
                  ) : (
                    sponsored.map((sp) => {
                      const statusBadge = getProposalStatusBadge(
                        sp.status,
                        sp.forVotes,
                        sp.againstVotes,
                        sp.quorumVotes,
                        sp.endBlock,
                        currentBlock
                      );
                      return (
                        <div
                          key={sp.id}
                          className={styles.proposalItem}
                          onClick={() => onNavigate(`proposal/${sp.id}`)}
                        >
                          <div className={styles.proposalHeader}>
                            <span className={styles.proposalId}>Prop {sp.id}</span>
                            <span className={styles.proposalSponsors}>
                              proposed by <AddressLink address={sp.proposer} onClick={(e) => { e?.stopPropagation(); onNavigate(`voter/${sp.proposer}`); }} />
                            </span>
                          </div>
                          <div className={styles.proposalTitle}>{sp.title}</div>
                          <div className={styles.proposalMeta}>
                            <span className={styles.proposalDate}>
                              {new Date(Number(sp.createdTimestamp) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className={styles.proposalVotes}>
                              {sp.forVotes} ↑ / {sp.quorumVotes}
                              <span style={{ margin: '0 4px' }}>·</span>
                              {sp.abstainVotes}
                              <span style={{ margin: '0 4px' }}>·</span>
                              {sp.againstVotes} ↓
                            </span>
                            {statusBadge && (
                              <span className={`${styles.proposalStatus} ${styles[statusBadge.className]}`}>
                                {statusBadge.label}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className={styles.rightColumn}>
          {/* Voting Power Stats */}
          <div className={styles.statsCard}>
            <div className={styles.statsHeader}>
              {votingPower} nouns represented{supplyPercentage ? ` (~${supplyPercentage}% of supply)` : ''}
            </div>

            {/* Vote Distribution Bar */}
            {totalVotes > 0 && (
              <div className={styles.voteBar}>
                <div className={styles.voteBarLabels}>
                  <span className={styles.forLabel}>For {forVotes}</span>
                  <span className={styles.againstLabel}>
                    {abstainVotes > 0 && <span className={styles.abstainLabel}>Abstain {abstainVotes} · </span>}
                    Against {againstVotes}
                  </span>
                </div>
                <div className={styles.voteBarTrack}>
                  {forVotes > 0 && (
                    <div 
                      className={styles.voteBarFor} 
                      style={{ width: `${(forVotes / totalVotes) * 100}%` }} 
                    />
                  )}
                  {abstainVotes > 0 && (
                    <div 
                      className={styles.voteBarAbstain} 
                      style={{ width: `${(abstainVotes / totalVotes) * 100}%` }} 
                    />
                  )}
                  {againstVotes > 0 && (
                    <div 
                      className={styles.voteBarAgainst} 
                      style={{ width: `${(againstVotes / totalVotes) * 100}%` }} 
                    />
                  )}
                </div>
                <div className={styles.voteCount}>
                  Voted on {totalVotes} proposals (~{reasonPercentage}% with reason)
                </div>
              </div>
            )}

            {/* Activity Filter */}
            <div className={styles.filterRow}>
              <span className={styles.filterLabel}>Show:</span>
              <select 
                className={styles.filterSelect}
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value as 'all' | 'with-reason')}
              >
                <option value="all">Everything</option>
                <option value="with-reason">With Reason</option>
              </select>
            </div>
          </div>

          {/* Activity Feed */}
          <div className={styles.activityFeed}>
            {filteredVotes.map((vote: any) => (
              <div 
                key={vote.id} 
                className={styles.activityItem}
                onClick={() => onNavigate(`proposal/${vote.proposalId}`)}
              >
                <div className={styles.activityHeader}>
                  <span className={styles.activityVoter}>{displayName}</span>
                  <span 
                    className={styles.activitySupport}
                    style={{ color: getSupportColor(vote.support) }}
                  >
                    {getSupportLabel(vote.support).toLowerCase()} for ({vote.votes || votingPower})
                  </span>
                  <span className={styles.activityProposal}>{vote.proposalId}: {vote.proposalTitle?.slice(0, 20) || 'Proposal'}...</span>
                </div>
                {vote.reason && (
                  <MarkdownRenderer 
                    content={vote.reason} 
                    className={styles.activityReason}
                  />
                )}
              </div>
            ))}
            {filteredVotes.length === 0 && (
              <div className={styles.emptyActivity}>No voting activity</div>
            )}
          </div>
        </div>
      </div>
      
      {showDelegateModal && (
        <DelegateModal
          userAddress={address as `0x${string}`}
          onClose={() => setShowDelegateModal(false)}
        />
      )}
    </div>
  );
}
